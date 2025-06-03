import html_to_pdf from "html-pdf-node";

const getPdfFromHtml = async (
	content,
	path,
	width,
	height,
	chromePath = null
) =>
	html_to_pdf.generatePdf(
		{ content },
		{
			width: `${width}mm`,
			height: `${height}mm`,
			path,
			printBackground: true,
			pageRanges: "1-1",
		},
		(err) => err && console.log("Error while generating PDF", err),
		chromePath ? { executablePath: chromePath } : {}
	);

export default getPdfFromHtml;
