Hooks.on("ready", () => {
    // game.diceTools = new DiceTools();
    // game.diceTools.render(true);

  if (!game.diceToolsButton) {
    game.diceToolsButton = new DiceToolsButton();
    game.diceToolsButton.render(true);
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