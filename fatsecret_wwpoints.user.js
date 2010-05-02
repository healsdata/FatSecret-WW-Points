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
 * @param XPCNativeWrapper oElm
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

function _inArray(arr,obj) {
    return (arr.indexOf(obj) != -1);
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

function generatePointData(){
	_generatePointTotal();
}


if (isUserConfigurationOK()){
	setup();
	generatePointData()
} else {
	alert('You are not currently tracking the necessary nutrients.')
}

