import parseParticipantVariable from "./parseParticipant.js";
import convertToHTML from "./convertToHTML.js";
import getPdfFromHtml from "./generatePdf.js";
import print from "nodejs-printer";

async function printPdf(filePath) {
	if (!fs.existsSync(filePath)) {
		console.error(`File does not exist: ${filePath}`);
		return;
	}
	await print(filePath, { orientation: "landscape" });
}

const sendToPrinter = async (canvas, participant, timeInfo) => {
	updatedItems = [];
	for (const item of canvas.items) {
		updatedtem = { ...item };
		updatedtem.text = await parseParticipantVariable(
			item.text,
			participant,
			timeInfo
		);
		updatedItems.push(updatedtem);
	}

	htmlContent = convertToHTML({
		items: updatedItems,
		canvas: canvas.canvas,
	});
	width = canvas.canvas.width;
	height = canvas.canvas.height;
	const dir = ".\\pdfs";
	if (!fs.existsSync(dir)) fs.mkdirSync(dir);
	const fileName = `.\\pdfs\\out-${participant.participantNo}.pdf`;
	await getPdfFromHtml(htmlContent, fileName, width, height);
	await printPdf(fileName);
};

export default sendToPrinter;
