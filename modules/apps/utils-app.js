class DiceTools extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dice-tools",
      title: game.i18n.localize("SFVTT.Tools"),
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
    
    // Store html reference for hook access
    this._html = html;
    
    // Update resource displays when the app opens or re-renders
    this.updateResourceDisplays(html);

    // Update resource displays when a token is selected
    this._onControlToken = () => {
      if (this._html) this.updateResourceDisplays(this._html);
    };
    Hooks.on("controlToken", this._onControlToken);

    html.find("#set-initiative").click(async ev => {
      ev.preventDefault();
      let init = parseFloat(html.find("#initiative-value").val());
      if (isNaN(init)) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.PleaseEnterValidNumber"));

      const combat = game.combat;
      if (!combat) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.NoActiveCombat"));

      // Get selected tokens
      const selected = canvas.tokens.controlled;
      if (!selected.length) {
        return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.SelectAtLeastOneToken"));
      }

      // Apply initiative to each selected token’s combatant
      for (let token of selected) {
        const combatant = combat.getCombatantByToken(token.id);
        if (!combatant) {
          ui.notifications.warn(game.i18n.format("SFVTT.NotInCombat", { name: token.name }));
          continue;
        }

        const actor = token.actor;
        // Wits added as tenth
        let tokenInit = init + actor.system.attributes.wits.value / 10;
        // Perception added as hundredth
        tokenInit = tokenInit + actor.system.attributes.perception.value / 100;
        // Random d10 (0-9)
        tokenInit = tokenInit + Math.floor(Math.random() * 10) / 1000;
        await combat.setInitiative(combatant.id, tokenInit);
        ui.notifications.info(game.i18n.format("SFVTT.Info.InitiativeSet", { name: token.name, value: tokenInit }));
      }
    });

    // Mark selected tokens as blocking this round
    html.find("#mark-blocking").click(async ev => {
        ev.preventDefault();
        this.setIcon("systems/sf_vtt/assets/icons/block.png");
    });
    
    // Mark selected tokens as having acted this round
    html.find("#mark-acted").click(async ev => {
      ev.preventDefault();
      this.setIcon("systems/sf_vtt/assets/icons/fist.png");
    });

    // --- Custom Dice Roller ---
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
      if (successes < 0) msg += "💔 ";
      msg += successes;
      msg += " " + game.i18n.localize(Math.abs(successes) === 1 ? "SFVTT.Roll.SuccessSingular" : "SFVTT.Roll.SuccessPlural");

      const content = `<div class="dice-roll">
        ${elem[0].outerHTML}
        <div class="dice-total">` + msg + `</div>
      `;

      // Send to chat
      ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker(),
        flavor: game.i18n.format("SFVTT.Roll.Flavor", { num: numDice, target: target }),
        content: content
      });      
    });

    // --- Reset All Initiatives (GM only) ---
    html.find("#reset-initiatives").click(async ev => {
      ev.preventDefault();
      if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.OnlyGMReset"));
      const combat = game.combat;
      if (!combat) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.NoActiveCombat"));

      for (let combatant of combat.combatants) {
        await combat.setInitiative(combatant.id, null);
        await combatant.update({ img: "" });
      }
      await combat.nextRound();

      ui.notifications.info(game.i18n.localize("SFVTT.Utils.InitiativesReset"));
    });

    // End combat
    html.find("#end-combat").click(async ev => {
      ev.preventDefault();
      if (!game.user.isGM) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.OnlyGMReset"));

      // Make sure there's an active combat
      const combat = game.combat;
      if (!combat) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.NoActiveCombat"));

      // Ask for confirmation
      new Dialog({
        title: game.i18n.localize("SFVTT.Dialog.EndCombat.Title"),
        content: game.i18n.localize("SFVTT.Dialog.EndCombat.Content"),
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label: game.i18n.localize("SFVTT.Dialog.YesEndIt"),
            callback: async () => {
              await combat.endCombat(); // Foundry method to end current combat
              ui.notifications.info(game.i18n.localize("SFVTT.Info.CombatFinished"));
            }
          },
          no: {
            icon: "<i class='fas fa-times'></i>",
            label: game.i18n.localize("SFVTT.Dialog.Cancel")
          }
        },
        default: "no"
      }).render(true);
    });

    // --- Resource Manager Handlers ---
    const resourceHandler = (resource, change) => async (ev) => {
      ev.preventDefault();
      const token = canvas.tokens.controlled[0];
      if (!token || !token.actor) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.SelectTokenModifyResources"));

      const actor = token.actor;
      const current = actor.system.resources[resource].current;
      const max = actor.system.resources[resource].max;
      const total = actor.system.resources[resource].total;
      let newValue = current + change;
      newValue = Math.max(0, Math.min(newValue, max)); // Clamp between 0 and max (temporary more than total is ok)

      await actor.update({ [`system.resources.${resource}.current`]: newValue });
      this.updateResourceDisplays(html);
      ui.notifications.info(`${token.name} ${resource}: ${newValue}/${total}`);
    };

    html.find("#health-increase").click(resourceHandler("health", 1));
    html.find("#health-decrease").click(resourceHandler("health", -1));
    html.find("#health-reset").click(async (ev) => {
      ev.preventDefault();
      const token = canvas.tokens.controlled[0];
      if (!token || !token.actor) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.PleaseSelectToken"));
      const total = token.actor.system.resources.health.total;
      await token.actor.update({ "system.resources.health.current": total });
      this.updateResourceDisplays(html);
      ui.notifications.info(game.i18n.format("SFVTT.Info.HealthReset", { name: token.name, total: total }));
    });

    html.find("#chi-increase").click(resourceHandler("chi", 1));
    html.find("#chi-decrease").click(resourceHandler("chi", -1));
    html.find("#chi-reset").click(async (ev) => {
      ev.preventDefault();
      const token = canvas.tokens.controlled[0];
      if (!token || !token.actor) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.PleaseSelectToken"));
      const total = token.actor.system.resources.chi.total;
      await token.actor.update({ "system.resources.chi.current": total });
      this.updateResourceDisplays(html);
      ui.notifications.info(game.i18n.format("SFVTT.Info.ChiReset", { name: token.name, total: total }));
    });

    html.find("#willpower-increase").click(resourceHandler("willpower", 1));
    html.find("#willpower-decrease").click(resourceHandler("willpower", -1));
    html.find("#willpower-reset").click(async (ev) => {
      ev.preventDefault();
      const token = canvas.tokens.controlled[0];
      if (!token || !token.actor) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.PleaseSelectToken"));
      const total = token.actor.system.resources.willpower.total;
      await token.actor.update({ "system.resources.willpower.current": total });
      this.updateResourceDisplays(html);
      ui.notifications.info(game.i18n.format("SFVTT.Info.WillpowerReset", { name: token.name, total: total }));
    });
  }

  updateResourceDisplays(html) {
    const token = canvas.tokens.controlled[0];
    if (!token || !token.actor) {
      html.find(".resource-value").text("—/—");
      return;
    }

    const health = token.actor.system.resources.health;
    const chi = token.actor.system.resources.chi;
    const willpower = token.actor.system.resources.willpower;

    html.find("#health-display").text(`${health.current}/${health.total}`);
    html.find("#chi-display").text(`${chi.current}/${chi.total}`);
    html.find("#willpower-display").text(`${willpower.current}/${willpower.total}`);
  }

  close(options) {
    // Clean up hooks when app closes
    if (this._onControlToken) {
      Hooks.off("controlToken", this._onControlToken);
    }
    return super.close(options);
  }

  async setIcon(actedIcon) {
    const combat = game.combat;
    if (!combat) return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.NoActiveCombat"));

    const selected = canvas.tokens.controlled;
    if (!selected.length) {
      return ui.notifications.warn(game.i18n.localize("SFVTT.Utils.SelectAtLeastOneToken"));
    }

    for (let token of selected) {
      if (!game.user.isGM && !token.isOwner) {
        ui.notifications.warn(game.i18n.format("SFVTT.Utils.NoPermissionMark", { name: token.name }));
        continue;
      }

      const combatant = combat.getCombatantByToken(token.id);
      if (!combatant) {
        ui.notifications.warn(game.i18n.format("SFVTT.NotInCombat", { name: token.name }));
        continue;
      }

      let mark = true;
      if (combatant.img === actedIcon) {
        mark = false;
      } else {
        ui.notifications.info(game.i18n.format("SFVTT.MarkedAsActed", { name: token.name }));
      }

      const activeGm = game.users.activeGM;
      const queryData = {
        tokenId: token.id,
        mark: mark,
        icon: mark ? actedIcon : ""
      };
      const queryValue = await activeGm.query("sf_vtt.markActed", queryData, { timeout: 5 * 1000 });
    }
  }
}