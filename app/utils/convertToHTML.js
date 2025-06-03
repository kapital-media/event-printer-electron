const convertToHTML = (value) => {
	const { items } = value;
	const html = `
    <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
    @page {
          margin: 0mm; /* Set margin on each page */
        }
    @media print {
    
      p { margin: 0 }
      * { margin: 0 }
      html, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, abbr, acronym, address, big, cite, code, del, dfn, em, img, ins, kbd, q, s, samp, small, strike, strong, sub, sup, tt, var, b, u, i, center, dl, dt, dd, ol, ul, li, fieldset, form, label, legend, table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas, details, embed, figure, figcaption, footer, header, hgroup, menu, nav, output, ruby, section, summary, time, mark, audio, video {
        margin: 0;
        padding: 0;
        border: 0;
        font-size: 100%;
        font: inherit;
        vertical-align: baseline;
      }
    }
    </style>
    <link href="https://fonts.googleapis.com/css?family=Roboto:400,700&display=swap&subset=latin-ext" rel="stylesheet">
    </head>
  <body style="overflow: hidden; margin: 0; padding: 0;">
    <div style="position: relative;">
      ${items
				.map((item) => {
					if (item.isImage) {
						return `<img 
            src="${item.text}" 
            style="
              position: absolute; 
              left: ${item.x}px; 
              top: ${item.y}px; 
              width: ${item.width}px; 
              height: ${item.height}px; 
            " 
          />`;
					} else {
						return `<span 
            style="
              position: absolute; 
              left: ${item.x}px; 
              top: ${item.y}px; 
              width: ${item.width}px; 
              height: ${item.height}px; 
              font-size: ${item.fontSize}px; 
              line-height: ${item.lineHeight}px; 
              font-weight: ${item.fontWeight || "400"}; 
              font-style: ${item.fontStyle || "normal"};
              text-decoration: ${item.textDecoration || "none"};
              text-align: ${item.textAlign || "left"}; 
              text-transform:  ${item.textTransform || "none"};
              color:  ${item.color || "#000000"};
              display: block;
              font-family: Roboto; 
            "
          >
            ${item.text}
          </span>`;
					}
				})
				.join("")}
    </div></body></html>`;

	return html;
};

export default convertToHTML;