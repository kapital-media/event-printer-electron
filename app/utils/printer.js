import parseParticipantVariable from "./parseParticipant.js";
import convertToHTML from "./convertToHTML.js";
import getPdfFromHtml from "./generatePdf.js";
import printer from "nodejs-printer";
import fs from "fs";
import path from "path";

async function printPdf(filePath) {
	if (!fs.existsSync(filePath)) {
		console.error(`File does not exist: ${filePath}`);
		return;
	}
	await printer.print(filePath, { orientation: "landscape" });
}

const sendToPrinter = async (
	canvas,
	participant,
	timeInfo,
	pdfsDir,
	chromePath
) => {
	const updatedItems = [];
	for (const item of canvas.items) {
		const updatedtem = { ...item };
		updatedtem.text = await parseParticipantVariable(
			item.text,
			participant,
			timeInfo
		);
		updatedItems.push(updatedtem);
	}

	const htmlContent = convertToHTML({
		items: updatedItems,
		canvas: canvas.canvas,
	});
	const width = canvas.canvas.width;
	const height = canvas.canvas.height;
	const fileName = path.join(pdfsDir, `out-${participant.participantNo}.pdf`);
	await getPdfFromHtml(htmlContent, fileName, width, height, chromePath);
	await printPdf(fileName);
};

export default sendToPrinter;
