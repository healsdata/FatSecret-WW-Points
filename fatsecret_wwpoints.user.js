// ==UserScript==
// @name          FatSecret WW Points
// @namespace     http://www.healsdata.com/
// @description   Adds the WW points to the FatSecret food diary.
// @copyright     2010 Jonathan Campbell (http://www.healsdata.com/)
// @license       MIT License http://www.opensource.org/licenses/mit-license.php
// @version       0.0.1
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
function getElementsByClassName(oElm, strTagName, strClassName){
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
function getWWPoints(numCalories, numGramsFat, numGramsFiber){
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


function _getLabelRow(){
	var breakoutDivs = getElementsByClassName(document, 'div', 'breakout');
	var tables = getElementsByClassName(breakoutDivs[0], 'table', 'generic');
	var targetTable = tables[0].getElementsByTagName("table").item(0);
	var tableRows = targetTable.getElementsByTagName("tr");	
	return tableRows[0];
}

function _getTotalsRow(){
	var breakoutDivs = getElementsByClassName(document, 'div', 'breakout');
	var tables = getElementsByClassName(breakoutDivs[0], 'table', 'generic');
	var targetTable = tables[0].getElementsByTagName("table").item(0);
	var tableRows = targetTable.getElementsByTagName("tr");	
	return tableRows[1];	
}

function _getMealSections(){
	var sectionHeaders = getElementsByClassName(document, 'td', 'greytitlex');
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

function _getValidMealSections(){
	return ['Breakfast', 'Lunch', 'Dinner', 'Snacks / Other'];
}

function setup(){
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
}

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

function _getRequiredNutrients(){
	return ['Fat', 'Fiber', 'KCals'];
}



function isUserConfigurationOK(){
	var requiredNutrients = _getRequiredNutrients();
	var trackedNutrients = _getNutrientsTracked();
	for (var i = 0; i < requiredNutrients.length; i++){
		if (!_inArray(trackedNutrients, requiredNutrients[i])){
			return false;
		}
	}
	return true;
}

function _getTotals(){
	var totals = new Array();
	var nutrientsTracked = _getNutrientsTracked();
	var targetCells = _getTotalsRow().getElementsByTagName("td");
	for (var i = 0; i < targetCells.length; i++){
		var nutrient = nutrientsTracked[i];
		var totalText = targetCells[i].innerHTML;
		
		if (totalText == '-'){
			totalText = '0';
		}
				
		totals[nutrient] = totalText;
	}		
	
	return totals;
}

function _generatePointTotal(){
	var totalsArr = _getTotals();
	var totalWWPoints = getWWPoints(totalsArr['KCals'], totalsArr['Fat'], totalsArr['Fiber']);
	if (totalWWPoints == 0){
		totalWWPoints = '-';
	}
		
	document.getElementById('ww_total').innerHTML = totalWWPoints;
}

function _isRowWithNutrients(row){
	var theTRs = row.getElementsByTagName('tr');
	return theTRs.length == 1;
}

function _generatePointsForRow(nutrientRow){
	var newCellClass = 'greyback';
	var targetCells = getElementsByClassName(nutrientRow, 'td', newCellClass);	
	if (targetCells.length == 0){
		newCellClass = 'greyback2';
		targetCells = getElementsByClassName(nutrientRow, 'td', newCellClass)
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
	targetCells = getElementsByClassName(nutrientRow, 'td', newCellClass)
	var nutrientsTracked = _getNutrientsTracked();
	for (var i = 0; i < targetCells.length; i++){
		var nutrient = nutrientsTracked[i];
		var totalText = targetCells[i].innerHTML;
		
		if (totalText == '-'){
			totalText = '0';
		}
				
		totalsArr[nutrient] = totalText;
	}		
		
	var totalWWPoints = getWWPoints(totalsArr['KCals'], totalsArr['Fat'], totalsArr['Fiber']);
	if (totalWWPoints == 0){
		totalWWPoints = '-';
	}	
	
	document.getElementById(uniqueId).innerHTML = totalWWPoints;	
}

function _generatePointsForSection(mealSection){
	var innerTables = getElementsByClassName(mealSection, 'table', 'generic');
	for (var i = 0; i < innerTables.length; i++){
		var theRow = innerTables[i];
		if (_isRowWithNutrients(theRow)){
			_generatePointsForRow(theRow);
		}
	}
}

function generatePointData(){
	_generatePointTotal();
	
	var mealSections = _getMealSections();
	for (var i = 0; i < mealSections.length; i++){
		_generatePointsForSection(mealSections[i]);
	}
}

if (isUserConfigurationOK()){
	setup();
	generatePointData()
} else {
	alert('You are not currently tracking the necessary nutrients.')
}

