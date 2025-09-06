export default class sfActor extends Actor {
    prepareData() {
        super.prepareData();
        // const actorData = this.system;
        // if (actorData.type === 'character') this._preparePlayerCharacterData(actorData);
    }

    prepareDerivedData() {
        const actorData = this.system;
        this._preparePlayerCharacterData(actorData);
    }

    _preparePlayerCharacterData(actorData) {
        this._setCharacterValues(actorData);
    }

    async _setCharacterValues(actorData) {
        for (let [key, attribute] of Object.entries(actorData.attributes)) {
            if (attribute.value < 1) {
                attribute.value = 1;
            } else if (attribute.value > attribute.max) {
                attribute.value = attribute.max;
            }
        }
        for (let [key, ability] of Object.entries(actorData.abilities.talents)) {
            if (ability.value < 0) {
                ability.value = 0;
            } else if (ability.value > ability.max) {
                ability.value = ability.max;
            }
        }
        for (let [key, ability] of Object.entries(actorData.abilities.skills)) {
            if (ability.value < 0) {
                ability.value = 0;
            } else if (ability.value > ability.max) {
                ability.value = ability.max;
            }
        }
        for (let [key, ability] of Object.entries(actorData.abilities.knowledges)) {
            if (ability.value < 0) {
                ability.value = 0;
            } else if (ability.value > ability.max) {
                ability.value = ability.max;
            }
        }
        for (let [key, background] of Object.entries(actorData.backgrounds)) {
            if (background.value < 0) {
                background.value = 0;
            } else if (background.value > background.max) {
                background.value = background.max;
            }
        }
        for (let [key, technique] of Object.entries(actorData.techniques)) {
            if (technique.value < 0) {
                technique.value = 0;
            } else if (technique.value > technique.max) {
                technique.value = technique.max;
            }
        }
    }

    setNote(note) {
        this.update(
            {
                "system.note": note 
            });
    }

    addLogEntry(Entry) {
        let log = this.system.log;
        log.push(Entry);
        this.update(
            {
                "system.log": log 
            });
    }
}