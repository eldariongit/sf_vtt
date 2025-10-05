const api = foundry.applications.api;
const sheets = foundry.applications.sheets;

export default class sfNpcSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
    sheetContext = {};

    static DEFAULT_OPTIONS = {
        tag: "form",
        classes: [ "sf_vtt", "sheet", "actor", "characterSheet"],
        actions: {

        },
        form: {
            submitOnChange: true,
            closeOnSubmit: false
        },
        position: {
            width: 650
        }
    }

    static PARTS = {
        main:  {
            template: "systems/sf_vtt/templates/sheets/npc/main.hbs"
        }
    }

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, DEFAULT_OPTIONS);
    }

    get title() {
        return this.actor.name;
    }

    /** @Override */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);

        options.parts = [ "main" ];
    }

    /** @Override */
    async _prepareContext(options) {
        /** This creates the basic Datamodel which is used to put the HTML together with Handlebars with Data. */
        const baseData = await super._prepareContext(options);

        const context =  {
            // general values
            editable: baseData.editable,
            isGM: baseData.user.isGM,
            actor: baseData.document,
            owner: baseData.document.isOwner,
            system: baseData.document.system,
            effects: baseData.document.effects,
            items: baseData.document.items,
            config: CONFIG.SFVTT
        }

        this.sheetContext = context;
        return context;
    }

    /** @Override */
    _onRender(context, options) {
        const tabs = new foundry.applications.ux.Tabs({
            navSelector: ".tabs", contentSelector: ".content", initial: "tab1"
        });
        tabs.bind(this.element);

        const itemQuantities = this.element.querySelectorAll('.tabs .item')
        for (const input of itemQuantities) {
            // keep in mind that if your callback is a named function instead of an arrow function expression
            // you'll need to use `bind(this)` to maintain context
            input.addEventListener("click", (e) => {
                //e.preventDefault();
                //e.stopImmediatePropagation();
                const tabName = $(e.currentTarget).data('tab');
                if (tabName) {
                    this._activeTab = tabName;
                    sessionStorage.setItem(`activeTab-${this.actor.id}`, tabName);
                }
            })
        }

        // Restore active tab after rendering
        this._restoreActiveTab();
    }

    _restoreActiveTab() {
        // Try to get from memory or sessionStorage
        const tabName = this._activeTab || sessionStorage.getItem(`activeTab-${this.id}`);
        if (!tabName) {
            return;
        }
        const tabs = this.form.querySelector('.tabs');
        if (!tabs) {
            return;
        }
        const tabElement = tabs.querySelector(`[data-tab="${tabName}"]`);
        if (tabElement) {
            tabElement.click(); // Simulate tab click to switch
        }
    }
}