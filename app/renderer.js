// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { ipcRenderer } = require("electron");

let defaultPrinter = 0;
function handleClick(myRadio) {
	console.log("Old value: " + defaultPrinter);
	console.log("New value: " + myRadio.value);
	defaultPrinter = myRadio.value;
}

ipcRenderer.on(
	"printers",
	(event, { printers, defaultPrinter: defaultPrinter_ }) => {
		defaultPrinter = defaultPrinter_;

		const printersRadio = document.getElementById("printersFieldSet");
		for (const printer of printers) {
			const div = document.createElement("div");
			div.innerHTML = `
					<input type="radio" id="${
						printer.name
					}" name="drone" onclick="handleClick(this);" value="${
				printer.name
			}" ${defaultPrinter.deviceId === printer.deviceId ? "checked" : ""} />
					<label for="${printer.name}">${printer.name}</label>`;
			printersRadio.append(div);
		}
	}
);
