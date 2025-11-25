class DiceTools extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dice-tools",
      title: "Tools",
      template: "systems/sf_vtt/templates/apps/utils-app.html",
      width: 320,
      height: "auto",
      tabs: [{ navSelector: ".tabs", contentSelector: ".content", initial: "roller" }]
    });
  }

  // Send GM flag to template
  getData(options) {
    const data = super.getData(options);
    data.isGM = game.user.isGM;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("#set-initiative").click(async ev => {
      ev.preventDefault();
      let init = parseFloat(html.find("#initiative-value").val());
      if (isNaN(init)) return ui.notifications.warn("Please enter a valid number.");

      const combat = game.combat;
      if (!combat) return ui.notifications.warn("No active combat.");

      // Get selected tokens
      const selected = canvas.tokens.controlled;
      if (!selected.length) {
        return ui.notifications.warn("Please select at least one token.");
      }

      // Apply initiative to each selected token’s combatant
      for (let token of selected) {
        let tokenInit = init;
        const combatant = combat.getCombatantByToken(token.id);
        if (!combatant) {
          ui.notifications.warn(`${token.name} is not in the combat tracker.`);
          continue;
        }

        const actor = token.actor;
        // Wits added as tenth
        tokenInit = tokenInit + actor.system.attributes.wits.value / 10;
        // Perception added as hundredth
        tokenInit = tokenInit + actor.system.attributes.perception.value / 100;
        // Random d10 (0-9)
        tokenInit = tokenInit + Math.floor(Math.random() * 10) / 1000;
        await combat.setInitiative(combatant.id, tokenInit);
        ui.notifications.info(`${token.name}: Initiative set to ${tokenInit}.`);
      }
    });

    html.find("#roll-button").click(async ev => {
      ev.preventDefault();
      const numDice = parseInt(html.find("#num-dice").val()) || 1;
      const target = parseInt(html.find("#target-value").val()) || 1;

      // Perform the roll
      const roll = await new Roll(`${numDice}d10cs>=${target}df=1`).evaluate();
      AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);

      // Sum up successes and deduct failures
      let successes = 0;
      roll.dice[0].results.forEach(die => {
        successes += die.count;
      });

//      const data = roll.toMessage({
//        speaker: ChatMessage.getSpeaker(),
//        flavor: `Rolled ${numDice}d10 vs Target ${target} → **${successes} successes**`
//      }, {create: false});
//      data.then(
//        function(value) {
//            value.style = 1;
//            ChatMessage.create(value);
//        },
//        function(error) {
//        }
//      );

      // Show in chat
      // roll.toMessage({
      //   speaker: ChatMessage.getSpeaker(),
      //   formula: "",
      //   //flavor: `Rolled ${numDice}d10 vs Target ${target} → **${successes} successes**`
      // });


      
      // Render dice HTML but remove formula
      let rollHTML = await roll.render();
      let elem = $(rollHTML);
      // elem.find(".dice-formula").remove();   // remove formula line
      // elem.find(".header").remove();   // remove formula
      elem.find(".dice-formula").remove();   // remove formula line
      elem.find(".part-formula").remove();   // remove formula line
      elem.find(".part-total").remove();   // remove total line
      elem.find(".dice-total").remove();   // remove total line

      // Build final message content
      // const content = `
      //   <div class="dice-roll">
      //    ${elem[0].outerHTML}
      //     <div class="dice-total">🤜 ${successes} successes</div>
      //   </div>
      // `;
      let msg = "";
      if (successes > 0) msg += "🤜 ";
      // if (successes == 0) msg += "🤜";
      if (successes < 0) msg += "💔 ";
      msg += successes;
      if (successes == 1 || successes == -1) msg += " success"
      else msg += " successes";

      const content = `<div class="dice-roll">
        ${elem[0].outerHTML}
        <div class="dice-total">` + msg + `</div>
      `;

      // Send to chat
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        flavor: `${numDice}d10 vs ${target}`,
        content: content
      });      
    });

    // --- Reset All Initiatives (GM only) ---
    html.find("#reset-initiatives").click(async ev => {
      ev.preventDefault();
      if (!game.user.isGM) return ui.notifications.warn("Only the GM can reset initiatives.");
      const combat = game.combat;
      if (!combat) return ui.notifications.warn("No active combat to reset.");

      for (let combatant of combat.combatants) {
        await combat.setInitiative(combatant.id, null);
      }
      await combat.nextRound();

      ui.notifications.info("All combatant initiatives have been reset.");
    });

    // End combat
    html.find("#end-combat").click(async ev => {
      ev.preventDefault();
      if (!game.user.isGM) return ui.notifications.warn("Only the GM can end combat.");

      // Make sure there's an active combat
      const combat = game.combat;
      if (!combat) return ui.notifications.warn("No active combat to end.");

      // Ask for confirmation
      new Dialog({
        title: "End Combat?",
        content: "<p>Do you really want to end the current combat?</p>",
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label: "Yes, end it",
            callback: async () => {
              await combat.endCombat(); // Foundry method to end current combat
              ui.notifications.info("Combat has been finished.");
            }
          },
          no: {
            icon: "<i class='fas fa-times'></i>",
            label: "Cancel"
          }
        },
        default: "no"
      }).render(true);
    });
  }
}