// ==UserScript==
// @name          FatSecret WW Points
// @namespace     http://www.healsdata.com/
// @description   Adds a point calculation to FatSecret based on nutritional facts.
// @copyright     2010 Jonathan Campbell (http://www.healsdata.com/)
// @license       MIT License http://www.opensource.org/licenses/mit-license.php
// @version       0.5.1
// @include       http://www.fatsecret.com/Diary.aspx?pa=fj*
// @include       http://fatsecret.com/Diary.aspx?pa=fj*
// @include       http://www.fatsecret.com/calories-nutrition/*
// @include       http://fatsecret.com/calories-nutrition/*
// ==/UserScript==

//
// Library Functions
//

/**
 * Removes everything but numbers from a string.
 * 
 * @param string theString
 * @return string
 */
function extractNumber(theString){
	return theString.replace(/[^0-9.]/g, '');	
}

/**
 * Returns the value of one variable in the query string
 * 
 * @link http://ilovethecode.com/Javascript/Javascript-Tutorials-How_To-Easy/Get_Query_String_Using_Javascript.shtml
 * @param string variableName
 * @return string
 */
function getQueryStringValue(variableName) {
	var queryString = window.location.search.substring(1);
	var keyValueString = queryString.split("&");
	for (var i = 0; i < keyValueString.length; i++) {
		var keyValue = keyValueString[i].split("=");
		if (keyValue[0] == variableName) {
			return keyValue[1];
		}
	}
	
	return '';
}

/**
 * Find all the elements inside the given element with a given class name.
 * 
 * @link http://codesnippets.joyent.com/posts/show/686
 * @param object oElm
 * @param string strTagName
 * @param string strClassName
 * @return array
 */
function getElementsByClassName(oElm, strTagName, strClassName){
	var arrElements = (strTagName == "*" && document.all)? document.all : oElm.getElementsByTagName(strTagName);
	var arrReturnElements = new Array();
	strClassName = strClassName.replace(/\-/g, "\\-");
	var oRegExp = new RegExp("(^|\\s)" + strClassName + "(\\s|$)");
	var oElement;
	for(var i=0; i<arrElements.length; i++){
	    oElement = arrElements[i];
	    if(oRegExp.test(oElement.className)){
	        arrReturnElements.push(oElement);
	    }
	}
	return (arrReturnElements)
}

/**
 * Rounds a given number to the nearest half number.
 * 
 * @param float theFloat
 * @return float
 */
function roundToNearestHalf(theFloat){
	var theRoundedInt = Math.round(theFloat);
	if (theRoundedInt == theFloat){
		return theFloat;
	} else if (theRoundedInt > theFloat){
		var theDecimal = 1 - theRoundedInt + theFloat;
	} else {
		var theDecimal = theFloat - theRoundedInt;
	}
	
	if (theDecimal < 0.33 || theDecimal > 0.66){
		return theRoundedInt;
	} else {
		var theBaseInt = theFloat - theDecimal;
		return theBaseInt + 0.5;
	}	
}

/**
 * Returns the number of points for a food item given some nutrition facts.
 * 
 * @todo Replace all references to this function to use NutritionFacts.getPoints
 * @link http://www.ehow.com/how_2058466_calculate-weight-watchers-points.html
 * @param float numCalories
 * @param float numGramsFat
 * @param float numGramsFiber
 * @return integer
 */
function calculatePoints(numCalories, numGramsFat, numGramsFiber){
	var facts = new NutritionFacts();
	facts.calories = numCalories;
	facts.totalFat = numGramsFat;
	facts.dietaryFiber = numGramsFiber;
	
	return facts.getPoints();
}

/**
 * Returns whether a given something is contained within another something.
 * 
 * @param mixed haystack
 * @param mixed needle
 * @return boolean
 */
function contains(haystack, needle){
	return (haystack.indexOf(needle) != -1);
}

//
// Food Diary Functions 
// @todo Refactor these into the FoodDiary class.
//

/**
 * Returns the row from the top of the journal that labels the nutrient columns.
 * 
 * @return object
 */
function _getLabelRow(){
	var breakoutDivs = getElementsByClassName(document, 'div', 'breakout');
	var tables = getElementsByClassName(breakoutDivs[0], 'table', 'generic');
	var targetTable = tables[0].getElementsByTagName("table").item(0);
	var tableRows = targetTable.getElementsByTagName("tr");	
	return tableRows[0];
}

/**
 * Returns the row at the top of the journal that contains the daily totals.
 * 
 * @return object
 */
function _getTotalsRow(){
	var breakoutDivs = getElementsByClassName(document, 'div', 'breakout');
	var tables = getElementsByClassName(breakoutDivs[0], 'table', 'generic');
	var targetTable = tables[0].getElementsByTagName("table").item(0);
	var tableRows = targetTable.getElementsByTagName("tr");	
	return tableRows[1];	
}

/**
 * A list of the titles of valid meal sections.
 * 
 * This currently eliminates "Day Summary:" which is structured like a section.
 * 
 * @return array
 */
function _getValidMealSections(){
	return ['Breakfast', 'Lunch', 'Dinner', 'Snacks / Other'];
}

/**
 * Returns all the meal sections on the current page.
 * 
 * @return array
 */
function _getMealSections(){
	var sectionHeaders = getElementsByClassName(document, 'td', 'greytitlex');
	var sections = new Array();
	for (var i = 0; i < sectionHeaders.length; i++){
		var currentSection = sectionHeaders[i];
		
		if (!contains(_getValidMealSections(), currentSection.innerHTML)){
			continue;
		}
		
		var tableParent = currentSection;
		var numTablesFound = 0;
		while (tableParent.nodeName != 'TABLE' || !numTablesFound){
			if (tableParent.nodeName == 'TABLE'){
				numTablesFound++;
			}
			tableParent = tableParent.parentNode;			
		}
		
		sections.push(tableParent);
	}
	return sections;
}

/**
 * Converts a number of points to a user friendly display version.
 * 
 * @param numPoints
 * @return string
 */
function _getPointDisplay(numPoints){
	if (numPoints == 0){
		return '-';
	}
	return numPoints;
}

/**
 * Returns whether a given section item contains nutrient information.
 * 
 * @param object sectionItem
 * @return boolean
 */
function _isSectionItemWithNutrients(sectionItem){
	if (_isSectionHeader(sectionItem)){
		return true;
	}
	
	var targetCells = getElementsByClassName(sectionItem, 'td', 'greyback');
	return targetCells.length > 0;	
}

/**
 * Returns whether a given section item is the header.
 * 
 * @param object sectionItem
 * @return boolean
 */
function _isSectionHeader(sectionItem){
	var targetCells = getElementsByClassName(sectionItem, 'td', 'greyback2');
	return targetCells.length > 0;
}

/**
 * Adds a cell to a section item where we should display points.
 * 
 * @param object sectionItem
 * @return string uniqueId - The ID of the new cell
 */
function _addPointCellToSectionItem(sectionItem){
	var newCellClass = 'greyback';
	if (_isSectionHeader(sectionItem)){
		newCellClass = 'greyback2';
	}
	
	var targetCells = getElementsByClassName(sectionItem, 'td', newCellClass);	

	var beforeMe = targetCells[0];
	
	var newCell = document.createElement("td");
	newCell.className = newCellClass;
	
	// @todo Make this specific to the item instead of just random
	var uniqueId = "hd_sectionitem_" + Math.floor(Math.random()*10001) + "_" + Math.floor(Math.random()*10001);
	newCell.id = uniqueId;

	newCellText = document.createTextNode('-');
	newCell.appendChild(newCellText);
	
	beforeMe.parentNode.insertBefore(newCell, beforeMe);
	
	return uniqueId;
}

/**
 * Adds the points to a row that contains nutrient information.
 * 
 * @param object nutrientRow
 * @return void
 */
function _generatePointsForRow(nutrientRow){
	var totalsArr = new Array();
	targetCells = getElementsByClassName(nutrientRow, 'td', 'greyback');
	var nutrientsTracked = _getNutrientsTracked();
	for (var i = 0; i < targetCells.length; i++){
		var nutrient = nutrientsTracked[i];
		var totalText = targetCells[i].innerHTML;
		
		if (totalText == '-'){
			totalText = '0';
		}
				
		totalsArr[nutrient] = totalText;
	}		

	var numItemPoints = calculatePoints(totalsArr['KCals'], totalsArr['Fat'], totalsArr['Fiber']);
	var cellId = _addPointCellToSectionItem(nutrientRow);
	showPointsInCell(numItemPoints, cellId);
	return numItemPoints;	
}

/**
 * Adds the points to one of the four meal sections.
 * 
 * @param object mealSection
 * @return void 
 */
function _generatePointsForSection(mealSection){
	var sectionPoints = 0;
	var innerTables = getElementsByClassName(mealSection, 'table', 'generic');
	
	for (var i = 0; i < innerTables.length; i++){
		var theRow = innerTables[i];
		if (_isSectionItemWithNutrients(theRow)){
			if (_isSectionHeader(theRow)){
				var sectionHeaderId = _addPointCellToSectionItem(theRow);
			} else {
				sectionPoints += _generatePointsForRow(theRow);
			}
		}
	}
	
	showPointsInCell(sectionPoints, sectionHeaderId);
	return sectionPoints;
}

/**
 * Returns a list of the required nutrients.
 * 
 * @return array
 */
function _getRequiredNutrients(){
	return ['Fat', 'Fiber', 'KCals'];
}

/**
 * Returns a list of the nutrients the user is currently tracking.
 * 
 * @return array
 */
function _getNutrientsTracked(){
	var nutrientsTracked = new Array()
	var targetCells = _getLabelRow().getElementsByTagName("td");
	for (var i = 0; i < targetCells.length; i++){
		var labelText = targetCells[i].innerHTML;
		
		if (labelText.indexOf("<") >= 0){
			var nutrient = labelText.substring(0, labelText.indexOf("<"));
		} else {
			var nutrient = labelText;
		}
		
		nutrientsTracked.push(nutrient);
	}	
	
	return nutrientsTracked;
}

/**
 * Returns whether the user is tracking all the required nutrients.
 * 
 * @return boolean
 */
function userIsTrackingRequiredNutrients(){
	var requiredNutrients = _getRequiredNutrients();
	var trackedNutrients = _getNutrientsTracked();
	for (var i = 0; i < requiredNutrients.length; i++){
		if (!contains(trackedNutrients, requiredNutrients[i])){
			return false;
		}
	}
	return true;
}

/**
 * The main runtime -- puts point data on the food diary.
 * 
 * @return void
 */
function generatePointData(){
	var totalPoints = 0;
	
	var mealSections = _getMealSections();
	for (var i = 0; i < mealSections.length; i++){
		totalPoints += _generatePointsForSection(mealSections[i]);
	}
		
	return totalPoints;
}

/**
 * Fills in the point total for the whole day
 * 
 * @param integer 
 * @return void
 */
function showPointsInCell(numPoints, cellId){
	document.getElementById(cellId).innerHTML = _getPointDisplay(numPoints);
}

/**
 * Adds the cell to the header where we should display the grand total.
 * 
 * @return void
 */
function addPointCellToHeader(){
	var labelCell = document.createElement("td");
	labelCell.className = 'grey';
	labelCell.style.fontSize = '10px';
	
	labelCellText = document.createTextNode('Points');
	labelCell.appendChild(labelCellText);
	
	var labelRow = _getLabelRow();
	labelRow.insertBefore(labelCell, labelRow.firstChild);
	
	var totalCell = document.createElement("td");
	totalCell.className = 'grey';
	totalCell.style.align = 'right';
	totalCell.style.fontSize = '11px';
	totalCell.style.fontWeight = 'bold';
	totalCell.id = 'hd_point_total';
	
	totalCellText = document.createTextNode('-');
	totalCell.appendChild(totalCellText);
	
	var totalRow = _getTotalsRow();
	totalRow.insertBefore(totalCell, totalRow.firstChild);	
	
	return totalCell.id;
}

/**
 * Displays an error when the user isn't tracking the needed nutrients.
 * 
 * @return void
 */
function showRequiredNutrientError(){
	var labelRow = _getLabelRow();

	var newRow = document.createElement("tr");
	var newCell = document.createElement("td");
	newCell.style.color = '#E45B00';
	newCell.style.fontSize = '11px';
	newCell.style.fontWeight = 'bold';
	newCell.setAttribute('colspan', 99);
	
	var errMsg = "Notice! You must track the following nutrients to display the point calculation: ";
	var requiredNutrients = _getRequiredNutrients();
	for (var i = 0; i < requiredNutrients.length; i++){
		if (i != 0){
			errMsg = errMsg + ", ";
		}
		errMsg = errMsg + requiredNutrients[i];
	}
	
	newCellText = document.createTextNode(errMsg);
	newCell.appendChild(newCellText);
	newRow.appendChild(newCell);
	labelRow.parentNode.parentNode.parentNode.parentNode.parentNode.appendChild(newRow);	
}

/**
 * Creates a nutrition facts panel from the "nutpanel" available on some pages. 
 * 
 * @todo This could be used to add points to the recipe page as well.
 * @return object NutritionFacts
 */
function getNutritionFactsFromPanel(){
	var panel = getElementsByClassName(document, 'div', 'nutpanel');
	
	var facts = new NutritionFacts();
	
	if (panel == ''){
		return facts;
	}
	
	panel = panel[0];
	
	var theCells = getElementsByClassName(panel, 'td', 'borderTop');
	for (var i = 0; i < theCells.length; i++){
		var currentCell = theCells[i];		
		
		if (contains(currentCell.innerHTML, 'Calories')){
			totalFatDivs = currentCell.getElementsByTagName('div');
			facts.caloriesFat = extractNumber(totalFatDivs[0].innerHTML);
			
			facts.calories = extractNumber(
				currentCell.innerHTML.substring(
						currentCell.innerHTML.indexOf('</div>')
				)
			);
		} else if (contains(currentCell.innerHTML, 'Total Fat')){
			facts.totalFat = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Saturated Fat')){
			facts.saturatedFat = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Polyunsaturated Fat')){
			facts.polyunsaturatedFat = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Monounsaturated Fat')){
			facts.monounsaturatedFat = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Cholesterol')){
			facts.cholesterol = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Sodium')){
			facts.sodium = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Potassium')){
			facts.potassium = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Total Carbohydrate')){
			facts.totalCarbohydrate = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Dietary Fiber')){
			facts.dietaryFiber = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Sugars')){
			facts.sugars = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Other Carbohydrate')){
			facts.otherCarbohydrate = extractNumber(currentCell.innerHTML);
		} else if (contains(currentCell.innerHTML, 'Protein')){
			facts.protein = extractNumber(currentCell.innerHTML);
		}			
	}
	
	return facts;
}

//
// Class Definitions
//

var CurrentPage = new function(){
	this.isFoodDiary = function(){
		return (location.pathname == '/Diary.aspx' 
			&& getQueryStringValue('pa') == 'fj');	
	}
	
	this.isNutritionFacts = function(){
		var factPanels = getElementsByClassName(document, 'td', 'factPanel');
		return factPanels.length == 1;
	}
}

var FoodDiaryPage = new function(){
	this.addPoints = function(){
		if (userIsTrackingRequiredNutrients()){
			var totalPoints = generatePointData();
			// Must come after all the calculations.
			// We're using the label row as the only index for which column is which.
			// @todo Clean this up so the order doesn't matter once work starts.		
			var totalCellId = addPointCellToHeader();
			showPointsInCell(totalPoints, totalCellId);
		} else {
			showRequiredNutrientError();
		}
	}	
}

var NutritionFactsPage = new function(){
	this.addPoints = function(){
		var numPoints = this._getNutritionFacts().getPoints();
		var pluralString = 's';
		if (numPoints == 1){
			pluralString = '';
		}
		
		this._getDisplayTargetElement().innerHTML += " and " + numPoints
										   		  + " point" + pluralString;
	}
	
	this._getNutritionFacts = function(){
		return getNutritionFactsFromPanel();
	}
	
	this._getDisplayTargetElement = function(){
		theDetails = getElementsByClassName(document, 'td', 'details');
		theTables = getElementsByClassName(theDetails[0], 'table', 'generic');
		theCells = theTables[1].getElementsByTagName('td');
		theBolds = theCells[0].getElementsByTagName('b');
		return theBolds[0];
	}
	
}

/**
 * Object to hold all the nutrient values and calculate points.
 */
function NutritionFacts(){
	this.calories = null;
	this.caloriesFat = null;
	this.totalFat = null;
	this.saturatedFat = null;
	this.polyunsaturatedFat = null;
	this.monounsaturatedFat = null;
	this.transFat = null;
	this.cholesterol = null;
	this.sodium = null;
	this.potassium = null;
	this.totalCarbohydrate = null;
	this.dietaryFiber = null;
	this.sugars = null;
	this.otherCarbohydrate = null;
	this.protein = null;

	/**
	 * @link http://www.ehow.com/how_2058466_calculate-weight-watchers-points.html
	 * @return integer
	 */
	this.getPoints = function(){
		numGramsFiber = this.dietaryFiber;
		if (numGramsFiber > 4){
			numGramsFiber = 4;
		}
		
		var thePoints = (this.calories / 50) + (this.totalFat / 12) - (numGramsFiber / 5);
		
		if (thePoints <= 0){
			return 0;
		} else if (thePoints < 1){
			thePoints = roundToNearestHalf(thePoints);
		} else {
			thePoints = Math.round(thePoints);
		}
		
		return thePoints;		
	}		
}

//
// Main Runtime
//

if (CurrentPage.isFoodDiary()) {
	FoodDiaryPage.addPoints();
} else if (CurrentPage.isNutritionFacts()) {
	NutritionFactsPage.addPoints();
}
