'use strict';

const $ = unsafeWindow.$;
var numberOfFields, fieldListPromise, pkmnListPromise;
var pkmnListPromiseList = [];
var inventory = [];

let button = $(`<li data-name="Inventory"><a title="Count Inventory"><img src="https://pfq-static.com/img/navbar/dex.png"> Inventory </a></li>`);
$(button).on("click", () => {
	fieldListPromise = new Promise((resolve, reject) => {
		unsafeWindow.ajax("fields/fieldlist", {
      uid: 0
		}).success((response) => {
			numberOfFields = response.fields.length;
			for (let i = 0; i < numberOfFields; i++) {
        pkmnListPromise = new Promise((resolve, reject) => {
          unsafeWindow.ajax("fields/field", {
            "id": i,
            "uid": "Citrisfur",
            "mode": "private"
          }).success((response) => {
            console.log("Retrieved Pokemon Field " + i + "/" + numberOfFields);
            inventory.push(response.html);
            resolve(response);
          }).failure((response) => {
            console.log("Error reading Pokemon Field " + i);
            reject(response);
          });
        });
        pkmnListPromiseList.push(pkmnListPromise);
      }
      pkmnListPromiseList[numberOfFields-1].then(function(value) {
        console.log("Read all Pokemon fields and built inventory");
        console.log(inventory);
      });
			resolve(response);
		}).failure((response) => {
			console.log("Error reading user's field list");
			reject(response);
		});
	});
});

$("#announcements > ul > li.spacer").eq(0).before(button);

// download file
/*var blob = new Blob([text_to_save], {type: "text/plain;charset=utf-8"});
saveAs(blob, "iv_inventory.txt");*/
