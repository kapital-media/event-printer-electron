// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { ipcRenderer } = require("electron");

ipcRenderer.on("test-file-path", (event, testFilePath) => {
	const elem = document.createElement("p");
	elem.innerText = testFilePath;
	document.getElementById("participants").prepend(elem);
});

ipcRenderer.on("printers", (event, { printers, defaultPrinter }) => {
	console.log(printers, defaultPrinter);

	const printersRadio = document.getElementById("printersFieldSet");
	for (const printer of printers) {
		const div = document.createElement("div");
		div.innerHTML = `
					<input type="radio" id="${printer.name}" name="drone" value="${printer.name}" ${
			defaultPrinter.deviceId === printer.deviceId ? "checked" : ""
		} />
					<label for="${printer.name}">${printer.name}</label>`;
		printersRadio.append(div);
	}
});
