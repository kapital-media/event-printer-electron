// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { ipcRenderer } = require("electron");

let defaultPrinter = null;
function handleClick(myRadio) {
	defaultPrinter = myRadio.value;
	ipcRenderer.invoke("setDefaultPrinter", defaultPrinter).then((result) => {
		console.log(result);
	});
}

ipcRenderer.on(
	"printers",
	(_event, { printers, defaultPrinter: defaultPrinter_ }) => {
		defaultPrinter = defaultPrinter_.deviceId;

		const printersRadio = document.getElementById("printersFieldSet");
		for (const printer of printers) {
			const div = document.createElement("div");
			div.innerHTML = `
					<input type="radio" id="${
						printer.name
					}" name="drone" onclick="handleClick(this);" value="${
				printer.name
			}" ${defaultPrinter === printer.deviceId ? "checked" : ""} />
					<label for="${printer.name}">${printer.name}</label>`;
			printersRadio.append(div);
		}
	}
);
