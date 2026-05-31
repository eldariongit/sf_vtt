const SFVTT_INIT_FLAG_SCOPE = "sf_vtt";
const SFVTT_INIT_STATE_KEY = "initiativeVisibility";
const SFVTT_INIT_MAP_KEY = "initiativeMap";
const SFVTT_INIT_PENDING_KEY = "initiativePending";
const SFVTT_SOCKET_EVENT = "system.sf_vtt";
const SFVTT_SOCKET_TYPE_SECRET_INITIATIVE = "sf_vtt.secretInitiative";

function sfvttGetCombatVisibility(combat) {
  return combat?.getFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_STATE_KEY) || "hidden";
}

async function sfvttSetCombatVisibility(combat, state) {
  if (!combat) {
    return;
  }
  return combat.setFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_STATE_KEY, state);
}

async function sfvttClearInitiativeMap(combat) {
  if (!combat) {
    return;
  }
  return combat.setFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_MAP_KEY, {});
}

async function sfvttAddHiddenInitiativeEntries(combat, entries) {
  if (!combat || !entries?.length) {
    return;
  }
  console.log("Adding hidden initiative entries to combat:", entries);
  const map = combat.getFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_MAP_KEY) || {};
  for (const entry of entries) {
    map[entry.tokenId] = entry.initiative;
    const combatant = combat.getCombatantByToken(entry.tokenId);
    if (combatant) {
      console.log(`Marking combatant ${combatant.name} as having chosen initiative (pending)`);
      await combatant.setFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_PENDING_KEY, true);
    }
  }
  await combat.setFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_MAP_KEY, map);
}

async function sfvttSubmitHiddenInitiatives(combat, entries) {
  if (!combat || !entries?.length) {
    return;
  } else if (game.user.isGM) {
    return sfvttAddHiddenInitiativeEntries(combat, entries);
  }
  if (game.socket) {
    game.socket.emit(SFVTT_SOCKET_EVENT, {
      type: SFVTT_SOCKET_TYPE_SECRET_INITIATIVE,
      combatId: combat.id,
      entries
    });
  }
}

async function sfvttRevealHiddenInitiatives(combat) {
  if (!combat) {
    return;
  }
  const map = combat.getFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_MAP_KEY) || {};
  const entries = Object.entries(map);
  if (!entries.length) {
    await sfvttSetCombatVisibility(combat, "revealed");
    return;
  }
  for (const [tokenId, initiative] of entries) {
    const combatant = combat.getCombatantByToken(tokenId);
    if (!combatant) {
      continue;
    }
    await combat.setInitiative(combatant.id, initiative);
    await combatant.unsetFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_PENDING_KEY);
  }
  await combat.setFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_MAP_KEY, {});
  await sfvttSetCombatVisibility(combat, "revealed");
}

function sfvttHandleSocketMessage(data) {
  if (!game.user.isGM || !data || data.type !== SFVTT_SOCKET_TYPE_SECRET_INITIATIVE) {
    return;
  }
  const combat = game.combat;
  if (!combat || combat.id !== data.combatId) {
    return;
  }
  console.log("Received secret initiative entries via socket:", data.entries);
  sfvttAddHiddenInitiativeEntries(combat, data.entries);
}

Hooks.on("ready", () => {
  if (!game.diceToolsButton) {
    game.diceToolsButton = new DiceToolsButton();
    game.diceToolsButton.render(true);
  }

  if (game.socket) {
    game.socket.on(SFVTT_SOCKET_EVENT, sfvttHandleSocketMessage);
  }
});

// Hooks.on("renderChatControls", (controls, html) => {
//   // Dice Roller button
//   if (!html.find(".dice-roller-button").length) {
//     const diceBtn = $(`<a class="dice-roller-button control-tool" title="Dice Roller">
//       <i class="fas fa-dice-d6"></i>
//     </a>`).click(() => {
//       if (!game.simpleDiceRoller) game.simpleDiceRoller = new SimpleDiceRoller();
//       game.simpleDiceRoller.render(true);
//     });
//     html.find(".chat-control-icon").before(diceBtn);
//   }

//   // Initiative Setter button
//   if (!html.find(".initiative-setter-button").length) {
//     const initBtn = $(`<a class="initiative-setter-button control-tool" title="Set Initiative">
//       <i class="fas fa-list-ol"></i>
//     </a>`).click(() => {
//       if (!game.initiativeSetter) game.initiativeSetter = new InitiativeSetter();
//       game.initiativeSetter.render(true);
//     });
//     html.find(".chat-control-icon").before(initBtn);
//   }
// });

// Hooks.on("renderChatControls", (controls, html) => {
//   if (!html.find(".dice-tools-button").length) {
//     const btn = $(`<a class="dice-tools-button control-tool" title="Dice Tools">
//       <i class="fas fa-dice"></i>
//     </a>`).click(() => {
//       if (!game.diceTools) {
//         game.diceTools = new DiceTools();
//       }
//       game.diceTools.render(true);
//     });
//     html.find(".chat-control-icon").before(btn);
//   }
// });

// Show rolls expanded
// Hooks.on("renderChatMessage", function (message){
//     setTimeout(() => {
//         $(`li.chat-message[data-message-id="${message.id}"] div.dice-tooltip`).css("display", "block")
//     }, 250)
// });

Hooks.on("renderChatMessage", function (message,html){
    html.find(`div.dice-tooltip`).css("display", "block")
});

Hooks.on("createCombat", async (combat) => {
  if (!game.user.isGM) return;
  await sfvttSetCombatVisibility(combat, "hidden");
  await sfvttClearInitiativeMap(combat);
});

Hooks.on("renderCombatTracker", (app, html) => {
  const combat = game.combat;
  if (!combat) {
    return;
  }
  const $html = html instanceof HTMLElement ? $(html) : html;
  const state = sfvttGetCombatVisibility(combat);
  $html.toggleClass("hidden-initiative", state === "hidden");
  const map = combat.getFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_MAP_KEY) || {};

  $html.find(".combatant").each((_, el) => {
    const $row = $(el);
    const combatantId = $row.attr("data-combatant-id") || $row.data("combatant-id");
    if (!combatantId) {
      return;
    }
    const pending = !!map[combatantId];
    $row.toggleClass("pending-init", pending);
    console.log(`Combatant ${combatantId} pending initiative:`, pending);
  });
});

// Clear the 'acted' status icon for all combatants when the combat round advances.
// This keeps the per-round "acted" markers in sync: marks are added via the
// "Mark Acted" button and removed automatically at the next round.
Hooks.on("updateCombat", async (combat, changed) => {
  // Only act when the round value changes
  if (changed && typeof changed.round != "undefined") {
    const actedIcon = "icons/svg/clock.svg";
    try {
      for (const combatant of combat.combatants) {
        const token = canvas.tokens.get(combatant.tokenId);
        if (!token || !token.document) continue;
        const effects = token.document.effects || [];
        if (effects.includes(actedIcon)) {
          token.toggleEffect(actedIcon); // toggleEffect will remove the icon if present
        }
      }
    } catch (err) {
      console.error("Error clearing acted icons on round change:", err);
    }
  }
  
  if (!game.user.isGM) {
    return;
  }

  await Promise.all([
    sfvttSetCombatVisibility(combat, "hidden"),
    sfvttClearInitiativeMap(combat),
    ...combat.combatants.map(combatant => combatant.unsetFlag(SFVTT_INIT_FLAG_SCOPE, SFVTT_INIT_PENDING_KEY))
  ]);


});