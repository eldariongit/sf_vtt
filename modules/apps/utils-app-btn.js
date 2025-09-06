class DiceToolsButton extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "dice-tools-button",
      title: "Dice Tools",
      template: "systems/sf_vtt/templates/apps/utils-app-btn.html",
      popOut: true,
      resizable: false,
      width: 60,
      height: 90,
      left: 100,
      bottom: 100
    });
  }

  async close(options) {
    return false; // Do nothing, app stays open
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find("button").click(() => {
      if (!game.diceTools) {
        game.diceTools = new DiceTools();
      } 
      game.diceTools.render(true);
    });
  }
}
