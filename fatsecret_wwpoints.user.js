// ==UserScript==
// @name          FatSecret WW Points
// @namespace     http://www.healsdata.com/
// @description   Adds the WW points to the FatSecret food diary.
// @copyright     2010 Jonathan Campbell (http://www.healsdata.com/)
// @license       MIT License http://www.opensource.org/licenses/mit-license.php
// @version       0.1
// @include       http://www.fatsecret.com/Diary.aspx?pa=fj
// @include       http://www.fatsecret.com/Diary.aspx?pa=fj&*
// ==/UserScript==

/**
 * Find all the elements inside the given element with a given class name.
 * 
 * @link http://codesnippets.joyent.com/posts/show/686
 * @param Element oElm
 * @param string strTagName
 * @param string strClassName
 * @return array
 */
function _getElementsByClassName(oElm, strTagName, strClassName){
	var arrElements = (strTagName == "*" && document.all)? document.all : oElm.getElementsByTagName(strTagName);
	var arrReturnElements = new Array();
	strClassName = strClassName.replace(/\-/g, "\\-");
	var oRegExp = new RegExp("(^|\\s)" + strClassName + "(\\s|$)");
	var oElement;
	for(var i=0; i<arrElements.length; i++){
		oElement = arrElements[i];
		if(oRegExp.test(oElement.getAttribute("class"))){
			arrReturnElements.push(oElement);
		}
	}
	return (arrReturnElements)
}

/**
 * Returns the number of WW points for a food item given some nutrition facts.
 * 
 * @link http://www.ehow.com/how_2058466_calculate-weight-watchers-points.html
 * @param float numCalories
 * @param float numGramsFat
 * @param float numGramsFiber
 * @return integer
 */
function _calcWWPoints(numCalories, numGramsFat, numGramsFiber){
	if (numGramsFiber > 4){
		numGramsFiber = 4;
	}
	return Math.round((numCalories / 50) + (numGramsFat / 12) - (numGramsFiber / 5));
}

/**
 * Returns whether a given something is contained within an array.
 * 
 * @param array haystack
 * @param mixed needle
 * @return boolean
 */
function _inArray(haystack, needle){
	return (haystack.indexOf(needle) != -1);
}

/**
 * Returns the row from the top of the journal that labels the nutrient columns.
 * 
 * @return object
 */
function _getLabelRow(){
	var breakoutDivs = _getElementsByClassName(document, 'div', 'breakout');
	var tables = _getElementsByClassName(breakoutDivs[0], 'table', 'generic');
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
	var breakoutDivs = _getElementsByClassName(document, 'div', 'breakout');
	var tables = _getElementsByClassName(breakoutDivs[0], 'table', 'generic');
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
	var sectionHeaders = _getElementsByClassName(document, 'td', 'greytitlex');
	var sections = new Array();
	for (var i = 0; i < sectionHeaders.length; i++){
		var currentSection = sectionHeaders[i];
		
		if (!_inArray(_getValidMealSections(), currentSection.innerHTML)){
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
 * Displays the total WW points for the day.
 * 
 * @return void
 */
function _generatePointTotal(){
	var totalsArr = new Array();
	var nutrientsTracked = _getNutrientsTracked();
	var targetCells = _getTotalsRow().getElementsByTagName("td");
	for (var i = 0; i < targetCells.length; i++){
		var nutrient = nutrientsTracked[i];
		var totalText = targetCells[i].innerHTML;
		
		if (totalText == '-'){
			totalText = '0';
		}
				
		totalsArr[nutrient] = totalText;
	}		

	var totalWWPoints = _calcWWPoints(totalsArr['KCals'], totalsArr['Fat'], totalsArr['Fiber']);
	if (totalWWPoints == 0){
		totalWWPoints = '-';
	}
		
	document.getElementById('ww_total').innerHTML = totalWWPoints;
}

/**
 * Returns whether a given section item contains nutrient information.
 * 
 * Although fragile, currently nutrient section items contain one row
 * while other section items contain multiple
 * 
 * @param object sectionItem
 * @return boolean
 */
function _isSectionItemWithNutrients(sectionItem){
	var theTRs = sectionItem.getElementsByTagName('tr');
	return theTRs.length == 1;
}

/**
 * Adds the WW points to a row that contains nutrient information.
 * 
 * @param object nutrientRow
 * @return void
 */
function _generatePointsForRow(nutrientRow){
	var newCellClass = 'greyback';
	var targetCells = _getElementsByClassName(nutrientRow, 'td', newCellClass);	
	if (targetCells.length == 0){
		newCellClass = 'greyback2';
		targetCells = _getElementsByClassName(nutrientRow, 'td', newCellClass)
	}
	
	var beforeMe = targetCells[0];
	
	var newCell = document.createElement("td");
	newCell.className = newCellClass;
	
	var uniqueId = "ww_row_" + Math.floor(Math.random()*101) + "_" + Math.floor(Math.random()*101);
	newCell.id = uniqueId;

	newCellText = document.createTextNode(totalWWPoints);
	newCell.appendChild(newCellText);
	
	beforeMe.parentNode.insertBefore(newCell, beforeMe);		
	
	var totalsArr = new Array();
	targetCells = _getElementsByClassName(nutrientRow, 'td', newCellClass)
	var nutrientsTracked = _getNutrientsTracked();
	for (var i = 0; i < targetCells.length; i++){
		var nutrient = nutrientsTracked[i];
		var totalText = targetCells[i].innerHTML;
		
		if (totalText == '-'){
			totalText = '0';
		}
				
		totalsArr[nutrient] = totalText;
	}		
		
	var totalWWPoints = _calcWWPoints(totalsArr['KCals'], totalsArr['Fat'], totalsArr['Fiber']);
	if (totalWWPoints == 0){
		totalWWPoints = '-';
	}	
	
	document.getElementById(uniqueId).innerHTML = totalWWPoints;	
}

/**
 * Adds the WW points to one of the four meal sections.
 * 
 * @param object mealSection
 * @return void 
 */
function _generatePointsForSection(mealSection){
	var innerTables = _getElementsByClassName(mealSection, 'table', 'generic');
	for (var i = 0; i < innerTables.length; i++){
		var theRow = innerTables[i];
		if (_isSectionItemWithNutrients(theRow)){
			_generatePointsForRow(theRow);
		}
	}
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
 * We can only calculate WW points if they are.
 * 
 * @return boolean
 */
function userIsTrackingRequiredNutrients(){
	var requiredNutrients = _getRequiredNutrients();
	var trackedNutrients = _getNutrientsTracked();
	for (var i = 0; i < requiredNutrients.length; i++){
		if (!_inArray(trackedNutrients, requiredNutrients[i])){
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
	var labelCell = document.createElement("td");
	labelCell.className = 'grey';
	labelCell.style.fontSize = '10px';
	
	labelCellText = document.createTextNode('WW');
	labelCell.appendChild(labelCellText);
	
	var labelRow = _getLabelRow();
	labelRow.insertBefore(labelCell, labelRow.firstChild);
	
	var totalCell = document.createElement("td");
	totalCell.className = 'grey';
	totalCell.style.align = 'right';
	totalCell.style.fontSize = '11px';
	totalCell.style.fontWeight = 'bold';
	totalCell.id = 'ww_total';
	
	totalCellText = document.createTextNode('-');
	totalCell.appendChild(totalCellText);
	
	var totalRow = _getTotalsRow();
	totalRow.insertBefore(totalCell, totalRow.firstChild);	
	
	_generatePointTotal();
	
	var mealSections = _getMealSections();
	for (var i = 0; i < mealSections.length; i++){
		_generatePointsForSection(mealSections[i]);
	}
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
	
	var errMsg = "Notice! You must track the following nutrients to display WW points: ";
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

if (userIsTrackingRequiredNutrients()){
	generatePointData()
} else {
	showRequiredNutrientError();
}

