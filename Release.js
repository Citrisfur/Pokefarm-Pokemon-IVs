// ==UserScript==
// @name         PokeFarm Pokemon IVs (Dev Build)
// @description  Display, catalogue and compare IVs for a user's owned Pokemon in PokeFarm
// @version      v0.0.5
// @author       Nathan Coy
// @match        https://pokefarm.com/fields
// @namespace    https://github.com/Citrisfur/
// @homepageURL  https://github.com/Citrisfur/Pokefarm-Pokemon-IVs
// @downloadURL  https://github.com/Citrisfur/Pokefarm-Pokemon-IVs/blob/main/Release.js
// @updateURL    https://github.com/Citrisfur/Pokefarm-Pokemon-IVs/blob/main/Release.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

'use strict';

console.log("Running PPIVsv0.0.5");

const $ = unsafeWindow.$;
const username = $("#globaluserlink").text();
const inventory = {};

const invButton = $('<li data-name="IV Inventory"><a title="Inventory Count" style="cursor: pointer"><img src="https://pfq-static.com/img/navbar/dex.png"> (...) Inventory </a></li>');
const dialogOuterDiv = $('<div class="dialog"><div><div></div></div></div>');
const dialogInnerDiv = $('<div><h3>PPIVs Settings</h3><div>');
const dialogIVRangeDiv = $('<div><div>');
const dialogIVRangeText = $('<p>Define a custom range for Perfect IVs here, used on the field display, in the mass release list, and when searching evo lines. Resets to default on page refresh!</p>');
const IVRangeLabel = $('<p>Min: </p>');
const minIVRange = $('<input type="number" id="minIV" min="0" max="31" value="31"/>');
const maxIVRange = $('<input type="number" id="maxIV" min="0" max="31" value="31"/>');
IVRangeLabel.append(minIVRange);
IVRangeLabel.append(" Max: ");
IVRangeLabel.append(maxIVRange);
const dialogResetDiv = $('<div><div>');
const dialogResetText = $('<p>If your inventory has varied greatly from the actual state of your fields, the Reset button below will remove and rebuild your inventory files (the PokemonInventory.json files) in your PokeFarm notepad. Note that the script will automatically update your inventory when you visit the fields individually, so this command should be run sparingly.</br></br>If your inventory files are completely missing, the script will rebuild them automatically without the need to run this operation. To do so, simply refresh the page.</br></br>You can check the progress of the rebuild in the Pokemon Info tab, below your fields.</br></p>');
const dialogInvResetButton = $('<button style="width: 100%; height: 4em">Reset</button>');
const dialogSocialsDiv = $('<div><div>');
const dialogSocialsText = $('<p>Follow along with development or report issues at PPIV\'s <a href="https://github.com/Citrisfur/Pokefarm-Pokemon-IVs">GitHub</a> page, or visit its <a href="/forum/thread/425427">PokeFarm forum</a>.</p>');
const dialogCloseDiv = $('<div style="text-align: right"><div>');
const dialogCloseButton = $('<button style="width: 25%; height: 2em">Close</button>');

dialogInvResetButton.prop("disabled", true);

let userMinIV = 31;
let userMaxIV = 31;
invButton.on("click", () => {
  dialogInvResetButton.on("click", () => {
    toggleInvResetButton();
    $('#field_nav > button:nth-child(1)').off("click", fieldHandler);
    $('#field_nav > button:nth-child(2)').off("click", fieldHandler);
    $('#field_nav > button:nth-child(3)').off("click", jumpButtonClick);
    $("body").find(dialogOuterDiv).remove();
    $("#core").removeClass('scrolllock');

    for (let i = 0; i < fileIDs.length; i++) {
      new Promise((resolve, reject) => {
        unsafeWindow.ajax("farm/notepad", {
          "mode": "command",
          "command": "delete",
          "operands": {
            "type": "file",
            "id": fileIDs[i]
          }
        }).success(() => {
          resolve("Deleted a PokemonInventory.json file");
        }).failure(() => {
          reject("Warning: Failed to delete a PokemonInventory.json file (may not exist)");
        });
      });
    }

    fileIDs = [];
    evoTrees = [];
    inventory.fields = [];
    updateInventoryCount();
    loadInventory().then(async (result) => {
      log(result);
      await getFieldSurvey();
      fieldHandler().catch(() => {});
      $('#field_nav > button:nth-child(1)').on("click", fieldHandler);
      $('#field_nav > button:nth-child(2)').on("click", fieldHandler);
      $('#field_nav > button:nth-child(3)').on("click", jumpButtonClick);
      toggleInvResetButton();
    });
  });

  dialogCloseButton.on("click", () => {
    $("body").find(dialogOuterDiv).remove();
    $("#core").removeClass('scrolllock');
    userMinIV = parseInt(minIVRange.val());
    if (isNaN(userMinIV)) {
      userMinIV = 31;
      minIVRange.val(31);
      log("Couldn't parse your minimum IV; it was set to 31.");
    } else if (userMinIV < 0) {
      userMinIV = 0;
      minIVRange.val(0);
      log("Your minimum IV was below 0; it was set to 0.");
    } else if (userMinIV > 31) {
      userMinIV = 31;
      minIVRange.val(31);
      log("Your minimum IV was above 31; it was set to 31.");
    }

    userMaxIV = parseInt(maxIVRange.val());
    if (isNaN(userMaxIV)) {
      userMaxIV = 31;
      maxIVRange.val(31);
      log("Couldn't parse your maximum IV; it was set to 31.");
    } else if (userMaxIV < 0) {
      userMaxIV = 0;
      maxIVRange.val(0);
      log("Your maximum IV was below 0; it was set to 0.");
    } else if (userMaxIV > 31) {
      userMaxIV = 31;
      maxIVRange.val(31);
      log("Your maximum IV was above 31; it was set to 31.");
    }

    if (userMinIV > userMaxIV) {
      userMinIV = userMaxIV;
      minIVRange.val(userMinIV);
      log(`Your set minimum IV was greater than your set maximum IV. They have both adjusted to ${userMaxIV}.`);
    }
  });

  dialogOuterDiv.find("div > div").append(dialogInnerDiv);
  dialogInnerDiv.append(dialogIVRangeDiv);
  dialogIVRangeDiv.append(dialogIVRangeText);
  dialogIVRangeDiv.append(IVRangeLabel);
  dialogInnerDiv.append(dialogResetDiv);
  dialogResetDiv.append(dialogResetText);
  dialogResetDiv.append(dialogInvResetButton);
  dialogInnerDiv.append(dialogSocialsDiv);
  dialogSocialsDiv.append(dialogSocialsText);
  dialogInnerDiv.append(dialogCloseDiv);
  dialogCloseDiv.append(dialogCloseButton);
  $("body").append(dialogOuterDiv);
  $("#core").addClass('scrolllock');
});

$("#announcements > ul > li.spacer").eq(0).before(invButton);

const consoleDiv = $('<div id="ivconsole"></div>');
const consoleButton = $('<button class="collapsible"><b>Pokemon Info</b></button>');
const consoleLog = $("<div></div>");
waitForElm("#field_field > .menu").then(() => {
  waitForElm("#field_field > div.field").then(() => {
    const background_colorCSS = $("#field_field").css("background-color");
    const borderCSS = $("#field_field").css("border");
    const textColorCSS = $("body").css("color");
    const font_familyCSS = $("body").css("font-family");
    const font_sizeCSS = $("body").css("font-size");
    const line_heightCSS = $("body").css("line-height");

    consoleDiv.css("background-color", background_colorCSS).css("margin", "16px auto").css("max-width", "600px").css("max-height", "400px").css("border-radius", "6px");
    consoleButton.css("background-color", background_colorCSS).css("border", borderCSS).css("color", textColorCSS).css("font-family", font_familyCSS).css("font-size", font_sizeCSS).css("line-height", line_heightCSS).css("width", "100%").css("border-radius", "6px").css("text-align", "left");
    consoleLog.css("background-color", background_colorCSS).css("border-radius", "6px").css("padding", "0px 18px 1px").css("display", "block").css("overflow", "auto").css("max-height", "380px");

    consoleButton.on("click", () => {
      if (consoleLog.css("display") == "none") {
        consoleLog.css("display", "block");
      } else {
        consoleLog.css("display", "none");
      }
    });

    consoleDiv.append(consoleButton);
    consoleDiv.append(consoleLog);
    $("#field_field").after(consoleDiv);
  });
});


function log(text, clearLog = false) {
  if (clearLog) {
    consoleLog.empty();
  }

  consoleLog.prepend(`<p>${text}</p>`);
  while (consoleLog.children().length > 5) {
    consoleLog.children().last().remove();
  }
}


function updateInventoryCount() {
  let totalPokemon = 0;
  for (const field of inventory.fields) {
    totalPokemon += field.pokemon.length;
  }

  invButton.find("a").contents().filter(function() {
    return (this.nodeType == 3);
  }).replaceWith(` (${totalPokemon ? totalPokemon : "..."}) Inventory`);
}


function toggleInvResetButton() {
  dialogInvResetButton.prop("disabled", !dialogInvResetButton.prop("disabled"));
}


let fileIDs = [];
let totalFields = 1;
function saveInventory(fieldIndex = -1) {
  return new Promise(async (resolve) => {
    // save full inventory
    // todo: have this also work if files already exist, just write over them
    if (fieldIndex == -1) {
      for (let fileNumber = 1; fileNumber <= Math.ceil(totalFields / 50); fileNumber++) {
        new Promise((resolve, reject) => {
          unsafeWindow.ajax("farm/notepad", {
            "directory": "",
            "mode": "newfile",
            "save": {
              "name": `PokemonInventory${fileNumber}.json`
            }
          }).success((response) => {
            const fileID = $($(response.html)[1]).data("fileform");
            fileIDs.push(fileID);
            new Promise((resolve, reject) => {
              unsafeWindow.ajax("farm/notepad", {
                "file": fileID,
                "mode": "save",
                "save": {
                  "name": `PokemonInventory${fileNumber}.json`,
                  "content": JSON.stringify(inventory.fields.slice(fileNumber * 50 - 50, fileNumber * 50))
                }
              }).success(() => {
                resolve(`Wrote inventory to PokemonInventory${fileNumber}.json`);
              }).failure(() => {
                reject(`ERROR: Could not write to file PokemonInventory${fileNumber}.json`);
              });
            });
            resolve(`Created new file PokemonInventory${fileNumber}.json in user's notepad`);
          }).failure(() => {
            reject(`ERROR: Could not create file PokemonInventory${fileNumber}.json`);
          });
        });
      }
    } else {
      if (!fileIDs[Math.floor(fieldIndex / 50)]) {
        await new Promise((resolve, reject) => {
          unsafeWindow.ajax("farm/notepad", {
            "directory": "",
            "mode": "newfile",
            "save": {
              "name": `PokemonInventory${Math.floor(fieldIndex / 50) + 1}.json`
            }
          }).success((response) => {
            fileIDs.push($($(response.html)[1]).data("fileform"));
            resolve(`Created new file PokemonInventory${Math.floor(fieldIndex / 50) + 1}.json in user's notepad`);
          }).failure(() => {
            reject(`ERROR: Could not create file PokemonInventory${Math.floor(fieldIndex / 50) + 1}.json`);
          });
        });
      }

      const lowerFieldIndex = fieldIndex % 50 ? Math.floor(fieldIndex / 50) * 50 : fieldIndex;
      const upperFieldIndex = fieldIndex % 50 ? Math.ceil(fieldIndex / 50) * 50 : fieldIndex + 50;
      new Promise((resolve, reject) => {
        unsafeWindow.ajax("farm/notepad", {
          "file": fileIDs[Math.floor(fieldIndex / 50)],
          "mode": "save",
          "save": {
            "name": `PokemonInventory${Math.floor(fieldIndex / 50) + 1}.json`,
            "content": JSON.stringify(inventory.fields.slice(lowerFieldIndex, upperFieldIndex))
          }
        }).success(() => {
          resolve(`Wrote inventory to PokemonInventory${Math.floor(fieldIndex / 50) + 1}.json`);
        }).failure(() => {
          reject(`ERROR: Could not write to file PokemonInventory${Math.floor(fieldIndex / 50) + 1}.json`);
        });
      });
    }

    updateInventoryCount();
    resolve("Inventory saved.");
  });
}


async function loadInventory() {
  return new Promise(async (resolve) => {
    inventory.fields = [];
    const inventoryFilePromiseList = [];
    await new Promise((resolve, reject) => {
      unsafeWindow.ajax("farm/notepad", {
        "directory": null
      }).success((response) => {
        $(response.html).find("a[data-file]").each(function(index) {
          if ($(this).text().slice(0, 16) == "PokemonInventory" && $(this).text().slice(-5) == ".json") {
            const fileID = $(this).data("file");
            fileIDs.push(fileID);

            inventoryFilePromiseList.push(new Promise((resolve, reject) => {
              unsafeWindow.ajax("farm/notepad", {
                "directory": null,
                "file": fileID
              }).success((response) => {
                $.merge(inventory.fields, JSON.parse($(response.html).find("textarea").text()));
                resolve(`Loaded notepad inventory file ID ${fileID}`);
              }).failure(() => {
                reject(`ERROR: Could not load notepad inventory file ID ${fileID}`);
              });
            }));
          }
        });
        resolve(`Loading inventory from ${username}'s inventory files...`);
      }).failure(() => {
        reject(`ERROR: Could not retrieve ${username}'s notepad files`);
      });
    });

    if (inventoryFilePromiseList.length) {
      log(`${fileIDs.length} inventory file(s) found...`);
      Promise.all(inventoryFilePromiseList).then(() => {
        updateInventoryCount();
        resolve(`Loaded inventory from ${username}'s notepad.`);
      });
    } else {
      log("Inventory does not exist, creating...", true);
      unsafeWindow.ajax("fields/fieldlist", {
        uid: 0
      }).success(async (response) => {
        totalFields = response.fields.length;
        let pokemonListPromiseList = [];
        for (let i = 0; i < response.fields.length; i++) {
          const field = {};
          // response.field does have an id but its the order fields were created
          // later queries (including PokeFarm's) use the order fields are arranged instead
          field.id = i;
          field.name = response.fields[i].name;
          field.pokemon = [];
          inventory.fields.push(field);

          // rate limit
          if (pokemonListPromiseList.length > 9) {
            await Promise.all(pokemonListPromiseList);
            pokemonListPromiseList = [];
          }

          pokemonListPromiseList.push(new Promise((resolve, reject) => {
            unsafeWindow.ajax("fields/pkmnlist", {
              "fieldid": i,
              "tooltip": "train"
            }).success((response) => {
              $(response.html).find(".fieldmontip").each(function() {
                const pokemon = {};
                pokemon.id = $(this).find("h3").eq(0).find("a").attr("href").split('/')[2];
                pokemon.name = $(this).find("h3").eq(0).text();
                pokemon.species = $(this).find(".icons").parent().text().substring(10, $(this).find(".icons").parent().text().length - 1);

                const pokemonAttributes = [];
                $(this).find(".icons").children().each(function() {
                  pokemonAttributes.push($(this).attr("title").substring(1, $(this).attr("title").length - 1));
                });

                pokemon.gender = pokemonAttributes.shift();
                pokemon.form = $(this).find(".forme").length ? $(this).find(".forme").text().substring(7) : null;
                pokemon.attributes = pokemonAttributes;
                pokemon.nature = $(this).find(".item").prev().clone().children().remove().end().text().substring(1);

                // if not sliced, 7-12 indexes are EVs
                const html_pokemonIVs = $(this).find("span[data-tooltip]").slice(0, 6);

                pokemon.ivs = {};
                pokemon.ivs.health = parseInt($(html_pokemonIVs[0]).text());
                pokemon.ivs.attack = parseInt($(html_pokemonIVs[1]).text());
                pokemon.ivs.defense = parseInt($(html_pokemonIVs[2]).text());
                pokemon.ivs.special_attack = parseInt($(html_pokemonIVs[3]).text());
                pokemon.ivs.special_defense = parseInt($(html_pokemonIVs[4]).text());
                pokemon.ivs.speed = parseInt($(html_pokemonIVs[5]).text());

                pokemon.iv_total = 0;
                pokemon.perfect_ivs = 0;
                for (const iv of Object.values(pokemon.ivs)) {
                  pokemon.iv_total += iv;
                  if (iv == 31) { pokemon.perfect_ivs++; }
                }

                pokemon.OT = null; // not available on tooltip

                field.pokemon.push(pokemon);
              });

              log(`Read Pokemon Field ${i + 1}/${totalFields}...`);
              resolve(`Read Pokemon Field ${i + 1}/${totalFields}...`);
            }).failure(() => {
              reject(`ERROR: Could not read Pokemon Field ${i + 1}`);
            });
          }));
        };

        Promise.all(pokemonListPromiseList).then(() => {
          saveInventory().then(() => {
            resolve("Built inventory from PokeFarm fields.");
          });
        });
      }).failure(() => {
        reject(`ERROR: Could not retrieve ${username}'s field list`);
      });
    }
  });
}


function getPokemonOT(pokemonID) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: `https://pokefarm.com/summary/${pokemonID}`,
      onload: (response) => {
        let pokemonOT = "";
        $(response.responseText).find("div.tlitem").each(function() {
          const tlEntry = $(this).text();
          if (tlEntry.includes("Adopted from the Shelter by")) {
            pokemonOT = tlEntry.substring(28);
            return false;
          } else if (tlEntry.includes("Egg hatched by")) {
            pokemonOT = tlEntry.substring(15);
            return false;
          } else if (tlEntry.includes("Traded with") && !tlEntry.includes("SYSTEM")) {
            pokemonOT = $(this).find("a").text();
          }
        });

        if (!pokemonOT) {
          pokemonOT = username;
        }

        resolve(pokemonOT);
      },
      onerror: (error) => {
        reject(error);
      }
    });
  });
}


let fieldSurvey;
function getFieldSurvey() {
  return new Promise((resolve, reject) => {
    unsafeWindow.ajax("fields/survey", {}).success((response) => {
      resolve(response.survey);
    }).failure(() => {
      reject("ERROR: Could not retrieve Sally's field survey");
    });
  }).then((result) => {
    evoTrees = [];
    fieldSurvey = result;
  });
}


let evoTrees = [];
function getEvoTree(pokemonSpecies) {
  return new Promise((resolve, reject) => {
    if (evoTrees[pokemonSpecies]) {
      resolve(`Evo line for the ${pokemonSpecies} species already generated.`);
    }

    const evoTree = [];
    unsafeWindow.ajax("dex/details", {
      "id": fieldSurvey.find(pokemon => pokemon[1] === pokemonSpecies)[0]
    }).success((response) => {
      if ($(response.html).find("div.evolutiontree").text().includes("is not known to evolve")) {
        evoTree.push(pokemonSpecies);
      } else {
        $($(response.html).find("div.evolutiontree")).find("span.name").each(function () {
          // if (!$(this).text().includes("Mega") && !$(this).text().includes("Totem")) { // might want this later
          if (!evoTree.includes($(this).text())) {
            evoTree.push($(this).text());
          }
        });
      }

      evoTrees[pokemonSpecies] = evoTree;
      resolve(`Generated evo line for the ${pokemonSpecies} species.`);
    }).failure(() => {
      reject(`ERROR: Could not generate evo line for the ${pokemonSpecies} species.`);
    });
  });
}


async function searchInventory(pokemonSpecies) {
  return new Promise((resolve) => {
    getEvoTree(pokemonSpecies).then(() => {
      const matchedPokemon = [];
      for (let evoSpecies of evoTrees[pokemonSpecies]) {
        let evoForm;
        if (evoSpecies.indexOf("[") != -1) {
          evoForm = evoSpecies.substring(evoSpecies.indexOf("[") + 1, evoSpecies.length - 1);
          evoSpecies = evoSpecies.substring(0, evoSpecies.indexOf("[") - 1);
        }

        for (const field of inventory.fields) {
          const matches = field.pokemon.filter(pokemon => pokemon.species == evoSpecies).filter(pokemon => pokemon.form == evoForm);

          for (const match of matches) {
            matchedPokemon.push([field.id, field.name, match]);
          }
        }
      }

      matchedPokemon.sort((a, b) => { return a[0] - b[0]; });
      resolve(matchedPokemon);
    });
  });
}


function waitForElm(selector, timeout = 2) {
  return new Promise((resolve, reject) => {
    if ($(selector).length) {
      return resolve($(selector));
    }

    const observer = new MutationObserver(() => {
      if ($(selector).length) {
        observer.disconnect();
        resolve($(selector));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    if (timeout) {
      setTimeout(() => reject(null), timeout * 1000);
    }
  });
}


function printPokemon(pokemon, release = "❌") {
  let ivString = "";
  let userPerfectIVs = 0;
  for (const iv of Object.values(pokemon.ivs)) {
    if (userMinIV <= iv && iv <= userMaxIV) {
      userPerfectIVs++;
      ivString += `${iv}/`;
    } else {
      ivString += "**/";
    }
  }
  ivString = ivString.substring(0, ivString.length - 1);

  return `${pokemon.attributes.length ? `${pokemon.attributes[0]}: ` : ""}<a href="/summary/${pokemon.id}">${pokemon.name != pokemon.species ? pokemon.name : `${pokemon.name}${pokemon.form ? ` [${pokemon.form}]` : ""}`}</a> [${pokemon.gender}]${(userPerfectIVs == 6 || userPerfectIVs == 5) ? ` ${pokemon.nature}` : ""} ${ivString}${userMinIV == 0 && userMaxIV == 31 ? "" : ` ${userPerfectIVs}`} = ${pokemon.iv_total} ${release}${pokemon.OT ? ` ${pokemon.OT}` : ""}`
}


let fieldName;
async function fieldHandler() {
  let previousElm = null;
  if (!fieldName) {
    fieldName = $("#field_nav > button:nth-child(3)").text();
  } else {
    await waitForElm("#field_nav > button:nth-child(3):disabled").then(async () => {
      await waitForElm("#field_nav > button:nth-child(3):not([disabled])").then((fieldNameButton) => {
        fieldName = fieldNameButton.text();
      });
    });
  }

  let inventoryUpdated = false;
  let field = inventory.fields.find(field => field.name === fieldName);
  if (!field) {
    field = {};
    field.id = null;
    field.name = fieldName;
    field.pokemon = [];
    inventory.fields.push(field);
    inventoryUpdated = true;
  }

  let fieldPokemonIDs = {};
  let fieldPokemonPromiseList = [];
  let addedCount = 0;
  waitForElm("div.menu").then(async () => {
    fieldPokemonIDs = {};
    const fieldmontips = $("#field_field > div.field > .tooltip_content > .fieldmontip");
    if (fieldmontips.length) {
      for (let i = 0; i < fieldmontips.length; i++) {
        // rate limit
        if (fieldPokemonPromiseList.length > 9) {
          await Promise.all(fieldPokemonPromiseList);
          fieldPokemonPromiseList = [];
        }

        fieldPokemonPromiseList.push(new Promise(async (resolve, reject) => {
          const fieldPokemonID = $(fieldmontips[i]).find("h3").eq(0).find("a").attr("href").split('/')[2];
          const fieldPokemonName = $(fieldmontips[i]).find("h3").eq(0).text();
          const fieldPokemonSpecies = $(fieldmontips[i]).find(".icons").parent().text().substring(10, $(fieldmontips[i]).find(".icons").parent().text().length - 1);
          const fieldPokemonForm = $(fieldmontips[i]).find(".forme").length ? $(fieldmontips[i]).find(".forme").text().substring(7) : null;
          let pokemon = field.pokemon.find(pokemon => pokemon.id === fieldPokemonID);
          if (pokemon) {
            if (pokemon.name != fieldPokemonName) {
              pokemon.name = fieldPokemonName;
              inventoryUpdated = true;
            }

            if (pokemon.species != fieldPokemonSpecies) {
              log(`Found ${pokemon.species} who evolved into ${fieldPokemonSpecies}, updating inventory...`);
              pokemon.species = fieldPokemonSpecies;
              inventoryUpdated = true;
            }

            if (pokemon.form != fieldPokemonForm) {
              log(`Found ${pokemon.species} who changed into ${fieldPokemonForm ? fieldPokemonForm : "Normal Forme"}, updating inventory...`);
              pokemon.form = fieldPokemonForm;
              inventoryUpdated = true;
            }
          } else {
            await new Promise((resolve, reject) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://pokefarm.com/summary/${fieldPokemonID}`,
                onload: (response) => {
                  resolve(response.responseText);
                },
                onerror: (error) => {
                  reject(error);
                }
              });
            }).then((response) => {
              pokemon = {};
              pokemon.id = fieldPokemonID;
              const pokemonAttributes = [];
              $(response).find("#summary_col1 > div.party > div > div.name").children().each(function(index) {
                pokemonAttributes.push(index ? $(this).attr("title").substring(1, $(this).attr("title").length - 1) : $(this).text());
              });

              pokemon.name = pokemonAttributes.shift();
              pokemon.species = fieldPokemonSpecies;
              pokemon.gender = pokemonAttributes.pop();
              pokemon.form = fieldPokemonForm;
              pokemon.attributes = pokemonAttributes;
              pokemon.nature = $(response).find("#summary_col1 > div.party > div > div.extra > div.nature > b").text();

              const html_pokemonIVs = $(response).find("#summary_col2 > div > div:nth-child(6) > table > tbody > tr:nth-child(2)").children().slice(1);
              pokemon.ivs = {};
              pokemon.ivs.health = parseInt($(html_pokemonIVs[0]).text());
              pokemon.ivs.attack = parseInt($(html_pokemonIVs[1]).text());
              pokemon.ivs.defense = parseInt($(html_pokemonIVs[2]).text());
              pokemon.ivs.special_attack = parseInt($(html_pokemonIVs[3]).text());
              pokemon.ivs.special_defense = parseInt($(html_pokemonIVs[4]).text());
              pokemon.ivs.speed = parseInt($(html_pokemonIVs[5]).text());
              pokemon.iv_total = parseInt($(html_pokemonIVs[6]).text());

              pokemon.perfect_ivs = 0;
              for (const iv of Object.values(pokemon.ivs)) {
                if (iv == 31) { pokemon.perfect_ivs++; }
              }

              $(response).find("div.tlitem").each(function() {
                const tlEntry = $(this).text();
                if (tlEntry.includes("Adopted from the Shelter by")) {
                  pokemon.OT = tlEntry.substring(28);
                  return false;
                } else if (tlEntry.includes("Egg hatched by")) {
                  pokemon.OT = tlEntry.substring(15);
                  return false;
                } else if (tlEntry.includes("Traded with") && !tlEntry.includes("SYSTEM")) {
                  pokemon.OT = $(this).find("a").text();
                }
              });

              if (!pokemon.OT) {
                pokemon.OT = username;
              }

              field.pokemon.push(pokemon);
              inventoryUpdated = true;
              addedCount++;
              const surveySpecies = fieldSurvey.find(surveyPokemon => surveyPokemon[1] === pokemon.species);
              if (!surveySpecies) {
                fieldSurvey.push([$(response).find("#pkmnspecdata > p:nth-child(1) > a").attr("href").substring(5), pokemon.species, 1]);
              } else {
                surveySpecies[2]++;
              }

              updateInventoryCount();
            });
          }

          let userPerfectIVs = 0;
          for (const iv of Object.values(pokemon.ivs)) {
            if (userMinIV <= iv && iv <= userMaxIV) {
              userPerfectIVs++;
            }
          }

          if (!(userMinIV == 0 && userMaxIV == 31)) {
            let color = "white";
            switch (userPerfectIVs) {
              case 0:
                color = "red";
                break;
              case 1:
                color = "violet";
                break;
              case 5:
                color = "green";
                break;
              case 6:
                color = "gold";
            }

            $(fieldmontips[i]).parent().prev().children().eq(1).before(`<p style="display: unset; position: absolute; bottom: 0px; right: 0px; margin: 0px; background: #000000; z-index: 1; color: ${color};">${userPerfectIVs}</p>`);
          }

          fieldPokemonIDs[fieldPokemonID] = userPerfectIVs;
          resolve(`Retrieved data of field Pokemon ${pokemon.id}`);
        }));
      }
    }

    Promise.all(fieldPokemonPromiseList).then(() => {
      let removedCount = 0;
      for (let i = field.pokemon.length - 1; i >= 0; i--) {
        if (!Object.keys(fieldPokemonIDs).includes(field.pokemon[i].id)) {
          const surveySpecies = fieldSurvey.find(pokemon => pokemon[1] === field.pokemon[i].species);
          if (surveySpecies) {
            surveySpecies[2]--;
          }
          inventory.fields.find(invField => invField.name === field.name).pokemon.splice(field.pokemon.indexOf(field.pokemon.find(pokemon => pokemon.id === field.pokemon[i].id)), 1);
          removedCount++;
          inventoryUpdated = true;
        }
      }

      if (addedCount) {
        log(`Added ${addedCount} new Pokemon found in the field to the inventory.`);
      }

      if (removedCount) {
        log(`Removed ${removedCount} Pokemon found in the inventory but not on the field.`);
      }

      if (inventoryUpdated) {
        saveInventory(inventory.fields.indexOf(field));
      };

      waitForElm('#field_field > .menu > label[data-menu="rename"]', 0).then((elm) => {
        elm.on("click", () => {
          waitForElm("body > div.dialog", 0).then((elm) => {
            const oldFieldName = elm.find("#renametextbox").val();
            elm.find("button").eq(0).on("click", () => {
              const newFieldName = elm.find("#renametextbox").val();
              inventory.fields.find(invField => invField.name === oldFieldName).name = newFieldName;
              log(`Field ${oldFieldName} renamed to ${newFieldName}.`);
              saveInventory(inventory.fields.indexOf(field));
            });
          });
        });
      });

      waitForElm('#field_field > .menu > label[data-menu="research"]', 0).then((elm) => {
        elm.on("click", () => {
          waitForElm("#fieldjumpnav > li > button").then((elm) => {
            elm.each(function() {
              $(this).on("click", fieldHandler);
            });
          });
        });
      });

      waitForElm('#field_field > .menu > label[data-menu="search"]', 0).then((elm) => {
        elm.on("click", () => {
          waitForElm("#searchfieldsbox > form > p:nth-child(3) > input[type=submit]", 0).then((elm) => {
            elm.on("click", () => {
              waitForElm("#fieldjumpnav > li > button").then((elm) => {
                elm.each(function() {
                  $(this).on("click", fieldHandler);
                });
              }).catch(() => {});
            });
          });
        });
      });

      waitForElm('#field_field > .menu > label[data-menu="release"]', 0).then((elm) => {
        if (!(userMinIV == 0 && userMaxIV == 31)) {
          elm.on("click", () => {
            waitForElm(".bulkpokemonlist > ul > li > label > .icons").then((elm) => {
              elm.each(function() {
                let color = "white";
                switch (fieldPokemonIDs[$(this).parent().find("input").val()]) {
                  case 0:
                    color = "red";
                    break;
                  case 1:
                    color = "violet";
                    break;
                  case 5:
                    color = "green";
                    break;
                  case 6:
                    color = "gold";
                }

                $(this).after(`<p style="margin-block-start: unset; margin-block-end: 1pt; text-align: center; color: ${color};">${fieldPokemonIDs[$(this).parent().find("input").val()]} Perfect IVs</p>`);
              });
            });
          });
        }
      });
    });

    $("span.fieldmon > img.big").each((index, elm) => {
      $(elm).on("click", () => {
        const fieldPokemonSpecies = `${$(elm).parent().next().find(".icons").parent().text().substring(10, $(elm).parent().next().find(".icons").parent().text().length - 1)}${$(elm).parent().next().find(".forme").length ? ` [${$(elm).parent().next().find(".forme").text().substring(7)}]` : ""}`;

        if (previousElm) {
          // ok find a way to slim this down good arceus
          // checks if the evo tree of this pokemon and the last pokemon are the same
          // this way it will not research until the user clicks on a new evo line
          // also does not work for different species on same evo line until species is clicked on for first time
          if (JSON.stringify(evoTrees[fieldPokemonSpecies]) == JSON.stringify(`${$(previousElm).parent().next().find(".icons").parent().text().substring(10, $(previousElm).parent().next().find(".icons").parent().text().length - 1)}${$(previousElm).parent().next().find(".forme").length ? ` [${$(previousElm).parent().next().find(".forme").text().substring(7)}]` : ""}`)) {
            return;
          }
        }

        previousElm = elm;

        log(`Searching the ${fieldPokemonSpecies} evo line...`, true);
        searchInventory(fieldPokemonSpecies).then(async (result) => {
          let surveyTotal = 0;
          for (const evoSpecies of evoTrees[fieldPokemonSpecies]) {
            const surveySpecies = fieldSurvey.find(pokemon => pokemon[1] === evoSpecies);
            if (surveySpecies) {
              surveyTotal += parseInt(surveySpecies[2]);
            }
          }

          let pokemonOTPromiseList = [];
          let output = "";
          let fieldNameHeader = "";
          let rangeInfoString = "";
          let warningTriggered = false;
          const checkedPokemonIDs = [];
          const bestPokemon = [null, null];
          const saveFieldIDs = [];
          await new Promise(async (resolve) => {
            if (userMinIV == 0 && userMaxIV == 31) {
              for (const [fieldID, fieldName, pokemon] of result) {
                if (!pokemon.OT) {
                  // rate limit
                  if (pokemonOTPromiseList.length > 9) {
                    await Promise.all(pokemonOTPromiseList);
                    pokemonOTPromiseList = [];
                  }

                  pokemonOTPromiseList.push(getPokemonOT(pokemon.id).then((result) => {
                    pokemon.OT = result;
                  }));
                }
              }

              Promise.all(pokemonOTPromiseList).then(() => {
                // test for both genders [male, female], if genderless first is used
                const diffOTPokemon = [[], []];
                for (const [fieldID, fieldName, pokemon] of result) {
                  if (pokemon.OT != username) {
                    diffOTPokemon[pokemon.gender == "F" ? 1 : 0].push(pokemon);
                  }
                }

                const highestIVTotal = [-1, -1];
                if (diffOTPokemon[0].length != 1) {
                  if (!diffOTPokemon[0].length) {
                    for (const [fieldID, fieldName, pokemon] of result) {
                      if (pokemon.gender != "F") {
                        diffOTPokemon[0].push(pokemon);
                      }
                    }
                  }

                  for (const tiePokemon of diffOTPokemon[0]) {
                    if (!highestIVTotal[0] || tiePokemon.iv_total > highestIVTotal[0]) {
                      highestIVTotal[0] = tiePokemon.iv_total;
                    }
                  }
                }

                if (diffOTPokemon[1].length != 1) {
                  if (!diffOTPokemon[1].length) {
                    for (const [fieldID, fieldName, pokemon] of result) {
                      if (pokemon.gender == "F") {
                        diffOTPokemon[1].push(pokemon);
                      }
                    }
                  }

                  for (const tiePokemon of diffOTPokemon[1]) {
                    if (!highestIVTotal[1] || tiePokemon.iv_total > highestIVTotal[1]) {
                      highestIVTotal[1] = tiePokemon.iv_total;
                    }
                  }
                }

                for (const [fieldID, fieldName, pokemon] of result) {
                  if (fieldName != fieldNameHeader) {
                    if (fieldNameHeader) {
                      output += "</br>";
                    }

                    fieldNameHeader = fieldName;
                    output += `<u style="text-decoration: unset; font-size: 14pt">${fieldNameHeader}:</u></br>`;
                  }

                  if (!bestPokemon[pokemon.gender == "F" ? 1 : 0]) {
                    bestPokemon[pokemon.gender == "F" ? 1 : 0] = pokemon;
                  }

                  let release = "✅";
                  if (checkedPokemonIDs.includes(pokemon.id)) {
                    release = "⚠️";
                    warningTriggered = true;
                  } else if (pokemon.attributes.length) {
                    release = "❌";
                    output += "<b>vv Keep: Special vv</b></br>";
                  }

                  if (diffOTPokemon[pokemon.gender == "F" ? 1 : 0].find(diffOTPkm => diffOTPkm.id === pokemon.id)) {
                    if (diffOTPokemon[pokemon.gender == "F" ? 1 : 0].length == 1) {
                      release = "❌";
                      output += `<b>vv Keep: Only different OT [${pokemon.gender}] vv</b></br>`;
                      bestPokemon[pokemon.gender == "F" ? 1 : 0] = pokemon;
                    } else if (pokemon.iv_total == highestIVTotal[pokemon.gender == "F" ? 1 : 0]) {
                      highestIVTotal[pokemon.gender == "F" ? 1 : 0] = -1;
                      release = "❌";
                      output += `<b>vv Keep: Highest IV total [${pokemon.gender}] vv</b></br>`;
                      bestPokemon[pokemon.gender == "F" ? 1 : 0] = pokemon;
                    }
                  }

                  output += `${printPokemon(pokemon, release)}</br>`;

                  let rangeIncludesFieldID = false;
                  for (let oldFieldID of saveFieldIDs) {
                    const lowerFieldIndex = oldFieldID % 50 ? Math.floor(oldFieldID / 50) * 50 : oldFieldID;
                    const upperFieldIndex = oldFieldID % 50 ? Math.ceil(oldFieldID / 50) * 50 : oldFieldID + 50;
                    if (lowerFieldIndex <= fieldID && fieldID < upperFieldIndex) { rangeIncludesFieldID = true; }
                  }

                  if (!rangeIncludesFieldID) {
                    saveFieldIDs.push(fieldID);
                  }

                  if (!saveFieldIDs.length) {
                    saveFieldIDs.push(fieldID);
                  }

                  checkedPokemonIDs.push(pokemon.id);
                }

                rangeInfoString = "Currently viewing all Pokemon of the species.</br></br>";
                resolve();
              });
            } else {
              const highestPerfectIVs = [[], []];
              for (const [fieldID, fieldName, pokemon] of result) {
                pokemon.userPerfectIVs = 0;
                for (const iv of Object.values(pokemon.ivs)) {
                  if (userMinIV <= iv && iv <= userMaxIV) {
                    pokemon.userPerfectIVs++;
                  }
                }

                if (!highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].length || pokemon.userPerfectIVs > highestPerfectIVs[pokemon.gender == "F" ? 1 : 0][0].userPerfectIVs) {
                  highestPerfectIVs[pokemon.gender == "F" ? 1 : 0] = [pokemon];
                } else if (pokemon.userPerfectIVs == highestPerfectIVs[pokemon.gender == "F" ? 1 : 0][0].userPerfectIVs) {
                  highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].push(pokemon);
                }
              }

              if (highestPerfectIVs[0].length != 1) {
                for (const tiePokemon of highestPerfectIVs[0]) {
                  if (!tiePokemon.OT) {
                    // rate limit
                    if (pokemonOTPromiseList.length > 9) {
                      await Promise.all(pokemonOTPromiseList);
                      pokemonOTPromiseList = [];
                    }

                    pokemonOTPromiseList.push(getPokemonOT(tiePokemon.id).then((result) => {
                      tiePokemon.OT = result;
                    }));
                  }
                }
              }

              if (highestPerfectIVs[1].length != 1) {
                for (const tiePokemon of highestPerfectIVs[1]) {
                  if (!tiePokemon.OT) {
                    // rate limit
                    if (pokemonOTPromiseList.length > 9) {
                      await Promise.all(pokemonOTPromiseList);
                      pokemonOTPromiseList = [];
                    }

                    pokemonOTPromiseList.push(getPokemonOT(tiePokemon.id).then((result) => {
                      tiePokemon.OT = result;
                    }));
                  }
                }
              }

              Promise.all(pokemonOTPromiseList).then(() => {
                const diffOTPokemon = [[], []];
                if (highestPerfectIVs[0].length != 1) {
                  for (const tiePokemon of highestPerfectIVs[0]) {
                    if (tiePokemon.OT != username) {
                      diffOTPokemon[0].push(tiePokemon);
                    }
                  }
                }

                if (highestPerfectIVs[1].length != 1) {
                  for (const tiePokemon of highestPerfectIVs[1]) {
                    if (tiePokemon.OT != username) {
                      diffOTPokemon[1].push(tiePokemon);
                    }
                  }
                }

                const highestIVTotal = [-1, -1];
                if (diffOTPokemon[0].length != 1) {
                  if (!diffOTPokemon[0].length) {
                    diffOTPokemon[0] = highestPerfectIVs[0];
                  }

                  for (const tiePokemon of diffOTPokemon[0]) {
                    if (!highestIVTotal[0] || tiePokemon.iv_total > highestIVTotal[0]) {
                      highestIVTotal[0] = tiePokemon.iv_total;
                    }
                  }
                }

                if (diffOTPokemon[1].length != 1) {
                  if (!diffOTPokemon[1].length) {
                    diffOTPokemon[1] = highestPerfectIVs[1];
                  }

                  for (const tiePokemon of diffOTPokemon[1]) {
                    if (!highestIVTotal[1] || tiePokemon.iv_total > highestIVTotal[1]) {
                      highestIVTotal[1] = tiePokemon.iv_total;
                    }
                  }
                }

                for (const [fieldID, fieldName, pokemon] of result) {
                  if (fieldName != fieldNameHeader) {
                    if (fieldNameHeader) {
                      output += "</br>";
                    }

                    fieldNameHeader = fieldName;
                    output += `<u style="text-decoration: unset; font-size: 14pt">${fieldNameHeader}:</u></br>`;
                  }

                  if (!bestPokemon[pokemon.gender == "F" ? 1 : 0]) {
                    bestPokemon[pokemon.gender == "F" ? 1 : 0] = pokemon;
                  }

                  let release = "✅";
                  if (checkedPokemonIDs.includes(pokemon.id)) {
                    release = "⚠️";
                    warningTriggered = true;
                  } else if (pokemon.attributes.length) {
                    release = "❌";
                    output += "<b>vv Keep: Special vv</b></br>";
                  }

                  if (pokemon.userPerfectIVs == 6) {
                    if (release == "✅") {
                      release = "❌";
                      output += "<b>vv Keep: 6 Perfect IVs vv</b></br>";
                    }

                    // attempts to find a OT different from the player from the 6IVs
                    if (!bestPokemon[pokemon.gender == "F" ? 1 : 0].OT || bestPokemon[pokemon.gender == "F" ? 1 : 0].OT == username) {
                      bestPokemon[pokemon.gender == "F" ? 1 : 0] = pokemon;
                    }
                  } else if (highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].find(tiePokemon => tiePokemon.id === pokemon.id)) {
                    if (highestPerfectIVs[pokemon.gender == "F" ? 1 : 0].length == 1) {
                      release = "❌";
                      output += `<b>vv Keep: Only highest IV [${pokemon.gender}] vv</b></br>`;
                      bestPokemon[pokemon.gender == "F" ? 1 : 0] = pokemon;
                    } else if (diffOTPokemon[pokemon.gender == "F" ? 1 : 0].find(diffOTPkm => diffOTPkm.id === pokemon.id)) {
                      if (diffOTPokemon[pokemon.gender == "F" ? 1 : 0].length == 1) {
                        release = "❌";
                        output += `<b>vv Keep: Only different OT [${pokemon.gender}] vv</b></br>`;
                        bestPokemon[pokemon.gender == "F" ? 1 : 0] = pokemon;
                      } else if (pokemon.iv_total == highestIVTotal[pokemon.gender == "F" ? 1 : 0]) {
                        highestIVTotal[pokemon.gender == "F" ? 1 : 0] = -1;
                        release = "❌";
                        output += `<b>vv Keep: Highest IV total [${pokemon.gender}] vv</b></br>`;
                        bestPokemon[pokemon.gender == "F" ? 1 : 0] = pokemon;
                      }
                    }
                  }

                  output += `${printPokemon(pokemon, release)}</br>`;

                  // if OTs were updated
                  if (pokemonOTPromiseList.length) {
                    let newOTPokemon = highestPerfectIVs[0].find(diffOTPkm => diffOTPkm.id === pokemon.id);
                    if (newOTPokemon) {
                      inventory.fields.find(invField => invField.id === fieldID).pokemon.find(invPokemon => invPokemon.id === pokemon.id).OT = newOTPokemon.OT;
                    }

                    newOTPokemon = highestPerfectIVs[1].find(diffOTPkm => diffOTPkm.id === pokemon.id);
                    if (newOTPokemon) {
                      inventory.fields.find(invField => invField.id === fieldID).pokemon.find(invPokemon => invPokemon.id === pokemon.id).OT = newOTPokemon.OT;
                    }

                    let rangeIncludesFieldID = false;
                    for (let oldFieldID of saveFieldIDs) {
                      const lowerFieldIndex = oldFieldID % 50 ? Math.floor(oldFieldID / 50) * 50 : oldFieldID;
                      const upperFieldIndex = oldFieldID % 50 ? Math.ceil(oldFieldID / 50) * 50 : oldFieldID + 50;
                      if (lowerFieldIndex <= fieldID && fieldID < upperFieldIndex) { rangeIncludesFieldID = true; }
                    }

                    if (!rangeIncludesFieldID) {
                      saveFieldIDs.push(fieldID);
                    }

                    if (!saveFieldIDs.length) {
                      saveFieldIDs.push(fieldID);
                    }
                  }

                  checkedPokemonIDs.push(pokemon.id);
                }

                rangeInfoString = (userMinIV == userMaxIV) ? (userMaxIV != 31 ? `Currently considering ${userMaxIV} IVs as Perfects.</br></br>` : "") : `Currently considering IVs between ${userMinIV} and ${userMaxIV} as Perfects.</br></br>`
                resolve();
              });
            }
          });

          output = `<i>Pokemon with checkmarks are recommended for release based on IVs and then original trainers.${warningTriggered ? "</br></br>One or more of your Pokemon were seen more than once in the inventory and were marked with a warning sign. You can remove these copies by revisiting the field(s) you moved the Pokemon from." : ""}</i></br></br>${rangeInfoString}${result.length > 2 ? `<b style="text-align: center">Best ${fieldPokemonSpecies} family pairing found:</b></br>${bestPokemon[0] ? `</br>${printPokemon(bestPokemon[0])}` : ""}${bestPokemon[1] ? `</br>${printPokemon(bestPokemon[1])}` : ""}</br></br></br>` : ""}Sally reports ${surveyTotal} Pokemon in the ${fieldPokemonSpecies} evo line; I know of ${result.length}:</br><p>${output}</p>`;
          log(output, true);

          for (const fieldID of saveFieldIDs) {
            saveInventory(fieldID);
          }
        });
      });
    });
  });
}


function jumpButtonClick() {
  waitForElm("#fieldjumpnav > li > button").then((elm) => {
    elm.each(function() {
      $(this).on("click", fieldHandler);
    });
  });
}


loadInventory().then(async (result) => {
  log(result);
  toggleInvResetButton();
  await getFieldSurvey();
  fieldHandler();

  // adds click listeners to previous, next, and all field jump buttons
  $('#field_nav > button:nth-child(1)').on("click", fieldHandler);
  $('#field_nav > button:nth-child(2)').on("click", fieldHandler);
  $('#field_nav > button:nth-child(3)').on("click", jumpButtonClick);
});
