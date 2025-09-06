import { SFVTT } from "./modules/config.js";
import sfActor from "./modules/objects/sfActor.js";
import sfCharacterSheet from "./modules/sheets/sfCharacterSheet.js";

Hooks.once("init", async () => {
    console.log("SFVTT | Initializing Street Fighter Core system");

    // Setting up the global configuration object
    CONFIG.SFVTT = SFVTT;
    CONFIG.INIT = true;
    CONFIG.Actor.documentClass = sfActor;

    // Register the custom sheets and unregister the start sheets
    // Items.unregisterSheet("core", ItemSheet);
    // Actors.unregisterSheet("core", ActorSheet);

    const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
    DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
    DocumentSheetConfig.registerSheet(Actor, "sf_vtt", sfCharacterSheet, {
        types: ["Fighter"], makeDefault: true, label: "SFVTT.SheetClassCharacter"
    })

    // Load all partial Handlebar Files
    preloadHandlebarsTemplates();

    // Register additional Handlebar Helpers
    registerHandlebarsHelpers();
});

Hooks.once("ready", async () => {
    // Finished initialization and release lock
    CONFIG.INIT = false;

    // Only execute when run as a GM
    if (!game.user.isGM) {
        return;
    }
});

function preloadHandlebarsTemplates() {
     const templatePaths = [
        "systems/sf_vtt/templates/partials/character-sheet-background.hbs",
        "systems/sf_vtt/templates/partials/character-sheet-combat.hbs",
        "systems/sf_vtt/templates/partials/character-sheet-items.hbs",
        "systems/sf_vtt/templates/partials/character-sheet-settings.hbs",
        "systems/sf_vtt/templates/partials/character-sheet-skills.hbs"
    ];
    return foundry.applications.handlebars.loadTemplates(templatePaths);
}

function registerHandlebarsHelpers() {
    Handlebars.registerHelper("equals", function(v1, v2) { return (v1 === v2) });
    Handlebars.registerHelper("contains", function(element, search) { return element.includes(search) });
    Handlebars.registerHelper("concat", function(s1, s2, s3 = "") { return s1 + s2 + s3 });
    Handlebars.registerHelper("isGreater", function(p1, p2) { return (p1 > p2) });
    Handlebars.registerHelper("isEqualOrGreater", function(p1, p2) { return (p1 >= p2) });
    Handlebars.registerHelper("ifOR", function(conditional1, conditional2) { return (conditional || conditional) });
    Handlebars.registerHelper("doLog", function(value) { console.log(value) });
    Handlebars.registerHelper("toBoolean", function(string) { return (string === true) });
    Handlebars.registerHelper("for", function(from, to, incr, content) {
        let result = "";
        for (let i = from; i < to; i += incr) {
            result += content.fn(i);
        }
        return result;
    });
    Handlebars.registerHelper("times", function(n, content) {
        let result = "";
        for (let i = 0; i < n; i++) {
            result += content.fn(i);
        }
        return result;
    });
    Handlebars.registerHelper("notEmpty", function(value) {
        if (value == 0 || value == "0") return true;
        if (value == null || value == "") return false;
        return true;
    });
    Handlebars.registerHelper("isChecked", function(value) {
		if (value == undefined) {
			return "";
		}
		if (value) {
			return "checked";
		}
		return "";
	});
    Handlebars.registerHelper('add', function (a, b, c) {
        if (typeof c === 'object') {
            c = 0;
        }
        return Number(a) + Number(b) + Number(c);
    });
}