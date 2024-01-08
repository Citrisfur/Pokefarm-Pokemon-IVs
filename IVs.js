'use strict';

var $ = unsafeWindow.$;
var totalPokemon = 0;
var pkmnListPromiseList = [];
var inventory = [];

let button = $(`<li data-name="Inventory"><a title="Count Inventory"><img src="https://pfq-static.com/img/navbar/dex.png"> Inventory </a></li>`);
$(button).on("click", () => {
	new Promise((resolve, reject) => {
		unsafeWindow.ajax("fields/fieldlist", {
			uid: 0
		}).success((response) => {
//			var numberOfFields = 3;  // testing code
			var numberOfFields = response.fields.length;
			for (let i = 0; i < numberOfFields; i++) {
				pkmnListPromiseList.push(new Promise((resolve, reject) => {
					unsafeWindow.ajax("fields/pkmnlist", {
						"fieldid": i,
            "tooltip": "train"
					}).success((response) => {
						console.log("Retrieved Pokemon Field " + i + "/" + numberOfFields);
						$(response.html).find(".fieldmontip").each(function() {
							var pokemonName = $(this).find(".icons").parent().text().substring(10);
							var pokemonForm = $(this).find(".forme").length != 0 ? "(" + $(this).find(".forme").text().substring(7) + ") " : "";
							var pokemonGender = "";
							$(this).find("img[title]").each(function() {
								pokemonGender += $(this).attr("title");
							});
							var pokemonIVs = "";
							var pokemonPerfectIVs = 0;
              var pokemonIVTotal = 0;
							$(this).find(".tooltip_content").parent().find("span").slice(0,6).each(function() {
								pokemonIVs += $(this).text() + "/";
								if ($(this).text() == "31") { ++pokemonPerfectIVs; }
								pokemonIVTotal += parseInt($(this).text());
							})
							pokemonIVs = pokemonIVs.substring(0, pokemonIVs.length-1);
							pokemonIVTotal = " = " + pokemonIVTotal;
							var pokemonNature = pokemonPerfectIVs == 6 ? $(this).find(".item").prev().clone().children().remove().end().text(): "";
							inventory.push(pokemonName + pokemonForm + pokemonGender + ": (" + pokemonPerfectIVs + ") " + pokemonIVs + pokemonIVTotal + pokemonNature);
							++totalPokemon;
						});
						resolve(response);
					}).failure((response) => {
						console.log("Error reading Pokemon Field " + i);
						reject(response);
					});
				}));
			}
			pkmnListPromiseList[numberOfFields-1].then(function(value) {
				console.log("Read all Pokemon fields and built inventory");
				console.log(inventory);
				$(button).html("<a title=\"Count Inventory\"><img src=\"https://pfq-static.com/img/navbar/dex.png\"> (" + totalPokemon + ") Inventory </a>")
				// download inventory
				/*var blob = new Blob([inventory], {type: "text/plain;charset=utf-8"});
				saveAs(blob, "iv_inventory.txt");*/
			});
			resolve(response);
		}).failure((response) => {
			console.log("Error reading Pokemon field list");
			reject(response);
		});
	});
});

$("#announcements > ul > li.spacer").eq(0).before(button);
