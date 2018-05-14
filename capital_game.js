var config = {
      apiKey: "AIzaSyANzhq6OOPtHhPROqqa1KgzpWUxoKfz_1o",
      authDomain: "hci-pr3-85789.firebaseapp.com",
      databaseURL: "https://hci-pr3-85789.firebaseio.com",
      projectId: "hci-pr3-85789",
      storageBucket: "hci-pr3-85789.appspot.com",
      messagingSenderId: "66106444869"
    };
firebase.initializeApp(config);
var fb = firebase.database();
var fb_data;

const MAP_URL = "https://www.google.com/maps/embed/v1/place?key=AIzaSyAYzo-xT8Q0nWPx6bGTjM02TW91MZCIKJw&maptype=satellite&q=";

var pr2__answer = document.getElementById('pr2__answer');
var pr2__question = document.getElementById('pr2__question');
var pr2__submit = document.getElementById('pr2__submit');
var table = document.getElementById('table');

var random_country;
var display = 0;
var pairs = [];

$.get('https://s3.ap-northeast-2.amazonaws.com/cs374-csv/country_capital_pairs.csv', function(data){ 
	for(var line in data.split(/\r\n|\n/)){
		if(line == 0)
			continue;
		pair = data.split(/\r\n|\n/)[line].split(",");
		pairs.push({
			"country":pair[0],
			"capital":pair[1]
		})
	}

	generateRandomCountry();
	$("#pr2__question").attr("onclick", "updateMap(random_country.country)");

	//autocomplete
	var capitals  =  pairs.map(entry => entry.capital);
	$(function() {
	    $("#pr2__answer").autocomplete({
	        source: capitals,
	        minLength: 2,
	       	delay: 0,
	        select: function(event, ui){
	        			setTimeout(() => pr2__submit.click(), 0);
	        		}
	    });
	});

 });

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function generateRandomCountry(){
	random_country = pairs[getRandomInt(pairs.length)];
	pr2__question.innerHTML = random_country.country;
	pr2__answer.focus();
	updateMap(random_country.country);
}

function submit() {	
	if(pr2__answer.value==random_country.capital){
		if($('input[name=display]:checked', '#radio').val() == "wrong"){
			$("input[name=display][value=all]", '#radio').prop('checked', true);
			updateDisplay();
		}

	}
	else{
		if($('input[name=display]:checked', '#radio').val() == "correct"){
			$("input[name=display][value=all]", '#radio').prop('checked', true);
			updateDisplay();
		}
	}

	var timestamp = Date.now();
	fb.ref("history/"+timestamp).set({
			"country": random_country.country,
			"capital":random_country.capital,
			"answer":pr2__answer.value,
			"timestamp":timestamp
	});

	fb.ref("history/"+timestamp).once('value').then(function(snapshot){
		fb.ref("undo/"+timestamp).set({
			"action": "add",
			"key": snapshot.key
		});	
	});

	pr2__answer.value = "";
	generateRandomCountry();
}

function updateDisplay(){
	let val = $('input[name=display]:checked', '#radio').val();
   	if(val=="wrong")
   		display = 2;
   	else if(val=="correct")
   		display = 1;
   	else
   		display = 0;
}

function updateDisplayTable(){
	updateDisplay();
	updateTable();
}

fb.ref("history/").on('value', function(snapshot){
	if(snapshot.numChildren()>1)
			$("#pr3__clear").attr("disabled", false);
		else
			$("#pr3__clear").attr("disabled", true);		

	fb_data = Object.values(snapshot.val());	
	updateTable();
});

function updateTable(){
	table.innerHTML = "";
	fb_data.map(o => {
		if(o.timestamp == 0) //dummy data in database to avoid null pointer exceptions
			return;

		if( (display == 0 || display == 1) && o.answer==o.capital){
			var row = table.insertRow(0);
			row.insertCell(0).innerHTML = o.country;
			row.insertCell(1).innerHTML = o.answer;
			row.insertCell(2).innerHTML = '<i class="fas fa-check"></i>';
			row.classList.add('blue');
			row.cells[2].innerHTML += '<input type=button value="Delete" onclick="deleteRow(' + o.timestamp + ')"/>';
			row.cells[0].onclick = () => { updateMap(o.country) };
			row.cells[0].onmouseover = "";
			row.cells[0].style = "cursor: pointer";
		}
		else if( (display == 0 || display == 2) && o.answer!=o.capital ){
			var row = table.insertRow(0);
			row.insertCell(0).innerHTML = o.country;
			row.insertCell(1).innerHTML = o.answer;
			row.insertCell(2).innerHTML = o.capital;
			row.classList.add('red');
			row.cells[1].classList.add('strike');
			row.cells[2].innerHTML += '<input type=button value="Delete" onclick="deleteRow(' + o.timestamp + ')"/>';
			row.cells[0].onclick = () => { updateMap(o.country) };
			row.cells[0].onmouseover = "";
			row.cells[0].style = "cursor: pointer";
		}	
	});
}

function deleteRow(timestamp){
	fb.ref("history/"+timestamp).once('value').then(function(snapshot){
		fb.ref("undo/"+Date.now()).set({
			"action": "delete",
			"key": snapshot.key,
			"value" : snapshot.val()
		});	
	});
	fb.ref("history").child(timestamp).remove();
}

$( document ).ready(function() {
	$('input[name=display]', '#radio').on('change', updateDisplayTable);
});

function clearData(){
	var timestamp = Date.now();

	fb.ref("history/").once('value').then(function(snapshot){
		fb.ref("undo/"+timestamp).set({
			"action": "clear",
			"value": snapshot.val()
		});	
	});

	fb.ref("history/").set({
		0:{
			"country": "",
			"capital":"",
			"answer":"",
			"timestamp": 0
		}
	});
	pr2__answer.focus();
}

function updateMap(search){
	$("#map").attr("src", MAP_URL+search);
}

function undo(){
	fb.ref("undo").limitToLast(1).once('child_added').then(function(snapshot){
		if(snapshot.val().action == "add")
			fb.ref("history/"+snapshot.val().key).remove();
		else if(snapshot.val().action == "delete")
			fb.ref("history/"+snapshot.val().key).set(snapshot.val().value);
		else
			fb.ref("history/").set(snapshot.val().value);			

		fb.ref("undo/"+snapshot.key).remove();
	});
}

function resetData(){
	fb.ref("history/").set({
		0:{
			"country": "",
			"capital":"",
			"answer":"",
			"timestamp": 0
		}
	});
	fb.ref("undo/").remove();
	pr2__answer.focus();
}

try{
	fb.ref("undo").on('value', function(snapshot){
		if(snapshot.numChildren()>0)
			$("#pr3__undo").attr("disabled", false);
		else
			$("#pr3__undo").attr("disabled", true);		
	})
}
catch(err){
	$("#pr3__undo").attr("disabled", true);
}