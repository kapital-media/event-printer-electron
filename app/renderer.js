// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
const { ipcRenderer } = require("electron");
const { app } = require("electron");
const path = require("path");

const getPdfPath = (filename) =>
	path.join(app.getAppPath(), "pdfs", `${filename}.pdf`);

let defaultPrinter = null;
function handleClick(myRadio) {
	defaultPrinter = myRadio.value;
	ipcRenderer.invoke("setDefaultPrinter", defaultPrinter);
}
function handleParticipantClick(myRadio) {
	const participantNo = myRadio.value;
	const iframe = document.getElementById("pdfIframe");
	iframe.src = getPdfPath(`out-${participantNo}`);
}
function resetPid() {
	ipcRenderer.invoke("resetPrinterId");
}
function handleChromePath(input) {
	ipcRenderer.invoke("setChromePath", input.value);
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
					}" name="printer" onclick="handleClick(this);" value="${
				printer.name
			}" ${defaultPrinter === printer.deviceId ? "checked" : ""} />
					<label for="${printer.name}">${printer.name}</label>`;
			printersRadio.append(div);
		}
	}
);

ipcRenderer.on("print", (_event, participant) => {
	const { name, surname, participantNo } = participant;

	const radio = document.getElementById("participants");
	const div = document.createElement("div");
	div.innerHTML = `
      <input type="radio" id="${participantNo}" name="participant" onclick="handleParticipantClick(this);" value="${participantNo}" checked />
      <label for="${participantNo}">${name} ${surname} #${participantNo}</label><br />`;
	radio.prepend(div);
});

ipcRenderer.on("printerId", (_event, printerId) => {
	const div = document.getElementById("printerId");
	const span = document.createElement("span");
	span.innerText = printerId;
	div.innerHTML = span.innerHTML;
});

ipcRenderer.on("chromePath", (_event, path) => {
	const input = document.getElementById("chromePath");
	input.value = path;
});

ipcRenderer.on("pdfIframe", (_event, participantNo) => {
	const iframe = document.getElementById("pdfIframe");
	iframe.src = getPdfPath(`out-${participantNo}`);
});
