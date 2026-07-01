import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

console.log("RandomPromptBuilder JS extension loaded");

app.registerExtension({
	name: "Comfy.RandomPromptBuilder.PromptDisplay",

	async beforeRegisterNodeDef(nodeType, nodeData, app) {

		// 1. Handle PromptDisplayNode display updates
		if (nodeData.name === "PromptDisplayNode") {
			const onExecuted = nodeType.prototype.onExecuted;
			nodeType.prototype.onExecuted = function (message) {
				onExecuted?.apply(this, arguments);

				if (message?.text) {
					const widget = this.widgets.find((w) => w.name === "text");
					if (widget) {
						widget.value = message.text[0];
						this.setDirtyCanvas(true, true);
					}
				}
			};
		}

		// 2. Handle RandomPromptBuilder prompt preview
		if (nodeData.name === "RandomPromptBuilder") {

			// Hook called when the node is created; adds a read-only display widget
			const onNodeCreated = nodeType.prototype.onNodeCreated;
			nodeType.prototype.onNodeCreated = function () {
				onNodeCreated?.apply(this, arguments);

				// Check whether the widget already exists
				if (!this.widgets.find(w => w.name === "generated_prompt_output")) {
					// Create a new read-only text widget
					const widget = ComfyWidgets["STRING"](
						this,
						"generated_prompt_output",
						["STRING", { multiline: true, default: "" }],
						app
					).widget;

					// Widget styling
					widget.inputEl.readOnly = true;
					widget.inputEl.style.opacity = "0.9";
					widget.inputEl.style.backgroundColor = "#1a2a1a";
					widget.inputEl.style.color = "#90EE90";
					widget.inputEl.style.minHeight = "100px";
					widget.inputEl.style.fontFamily = "monospace";
					widget.inputEl.style.fontSize = "11px";
					widget.inputEl.placeholder = "Generated prompt will appear here after execution...";

					// Adjust the node size
					this.setSize([this.size[0], this.computeSize()[1]]);
				}
			};

			// Hook called after execution; updates the widget
			const onExecuted = nodeType.prototype.onExecuted;
			nodeType.prototype.onExecuted = function (message) {
				onExecuted?.apply(this, arguments);

				console.log("[RandomPromptBuilder] onExecuted triggered, message:", message);

				// Read prompt text from the message payload
				let promptText = null;

				if (message?.generated_prompt?.[0]) {
					promptText = message.generated_prompt[0];
				} else if (message?.positive_prompt?.[0]) {
					promptText = message.positive_prompt[0];
				} else if (message?.text?.[0]) {
					promptText = message.text[0];
				}

				if (promptText) {
					// Find the display widget
					const widget = this.widgets.find(
						w => w.name === "generated_prompt_output"
					);

					if (widget) {
						widget.value = promptText;
						console.log("[RandomPromptBuilder] Widget updated with prompt:",
							promptText.substring(0, 100) + "...");
					} else {
						console.warn("[RandomPromptBuilder] Widget 'generated_prompt_output' not found!");
						console.log("Available widgets:", this.widgets?.map(w => w.name));
					}

					// Refresh the canvas
					this.setDirtyCanvas(true, true);
				} else {
					console.warn("[RandomPromptBuilder] No prompt text found in message");
				}
			};
		}
	},
});
