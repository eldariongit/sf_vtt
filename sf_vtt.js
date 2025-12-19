import { SFVTT } from "./modules/config.js";
import sfActor from "./modules/objects/sfActor.js";
import sfCharacterSheet from "./modules/sheets/sfCharacterSheet.js";
import sfNpcSheet from "./modules/sheets/sfNpcSheet.js";

Hooks.once("init", async () => {
    console.log(game.i18n.localize("SFVTT.Init.Initializing"));

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
    DocumentSheetConfig.registerSheet(Actor, "sf_vtt", sfNpcSheet, {
        types: ["NPC"], makeDefault: false, label: "SFVTT.SheetClassNpc"
    })

    // Load all partial Handlebar Files
    preloadHandlebarsTemplates();

    // Register additional Handlebar Helpers
    registerHandlebarsHelpers();
});

Hooks.once("ready", () => {
    // Finished initialization and release lock
    CONFIG.INIT = false;

    if (!document.getElementById("token-hover-preview")) {
        const div = document.createElement("div");
        div.id = "token-hover-preview";
        document.body.appendChild(div);
    }

    console.log(game.i18n.format("SFVTT.Init.ReadyGM"), game.user.isGM);

    if (!game.user.isGM) {
        return;
    }

    // GM-only stuff
});

async function markActedHandler(data, {timeout}) {
    const combatant = game.combat.getCombatantByToken(data.tokenId);
    if (combatant) {
        //await combatant.update({ img: data.icon });
        if (data.mark) {
            await combatant.update({ img: "systems/sf_vtt/assets/icons/fist.png" });
        } else {
            await combatant.update({ img: "" });
        }
    }
    return {};
}

CONFIG.queries["sf_vtt.markActed"] = markActedHandler;

Hooks.on("hoverToken", (token, hovered) => {
  const preview = document.getElementById("token-hover-preview");
  if (!preview) return;

  if (hovered) {
    const actor = token.actor;
    if (!actor) return;

    // actor.img = default prototype image (the one you want to show)
    const img = actor.img;
    if (!img) return;

    preview.innerHTML = `<img src="${img}">`;
    preview.style.display = "block";

    // Track mouse movement to reposition the preview
    const moveHandler = ev => {
      preview.style.left = (ev.clientX + 15) + "px";
      preview.style.top = (ev.clientY - 285) + "px";
    };

    document.addEventListener("mousemove", moveHandler);

    // Store the handler so we can remove it later
    token._hoverMoveHandler = moveHandler;

  } else {
    preview.style.display = "none";
    preview.innerHTML = "";

    // Remove mousemove handler
    if (token._hoverMoveHandler) {
      document.removeEventListener("mousemove", token._hoverMoveHandler);
      token._hoverMoveHandler = null;
    }
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