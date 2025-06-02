const electron = require("electron");
const config = require("./config");
const { io } = require("socket.io-client");
const qrcode = require("qrcode");
const html_to_pdf = require("html-pdf-node");
const path = require("path");
const fs = require("fs");
const app = electron.app;
const shell = electron.shell;
const Menu = electron.Menu;
const Tray = electron.Tray;
const dialog = electron.dialog;
const crashReporter = electron.crashReporter;
const BrowserWindow = electron.BrowserWindow;
const nativeImage = electron.nativeImage;
const ipcMain = electron.ipcMain;
const options = { extraHeaders: "pragma: no-cache\n" };
const appIcon = nativeImage.createFromPath(config.iconPath);
const trayIcon = appIcon.resize({ width: 20, height: 20 });
const {
	print,
	getPrinters,
	getDefaultPrinter,
	setDefaultPrinter,
} = require("nodejs-printer");
let mainWindow, splashwindow;
let contextMenu = null;
let filepath = null;
const dayjs = require("dayjs");
const timezone = require("dayjs/plugin/timezone");
const localeData = require("dayjs/plugin/localeData");
const duration = require("dayjs/plugin/duration");
const utc = require("dayjs/plugin/utc");
require("dayjs/locale/tr");
require("dayjs/locale/en");

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localeData);
dayjs.extend(duration);

const socket = io("https://beta-api.kapital.com.tr", {
	autoConnect: true,
});

// const clientPrinterId = `${Math.floor(100000 + Math.random() * 900000)}`;
const clientPrinterId = `123456`;

const getPdfFromHtml = async (content, path, width, height) =>
	html_to_pdf.generatePdf(
		{ content },
		{
			width: `${width}mm`,
			height: `${height}mm`,
			path,
			printBackground: true,
			pageRanges: "1-1",
		}
	);

const defaultTimeZone = "Europe/Istanbul";
const getLocalDateFormat = () => {
	const now = new Date(2013, 11, 31);
	let str = now.toLocaleDateString();
	str = str.replace("31", "DD");
	str = str.replace("12", "MM");
	str = str.replace("2013", "YYYY");
	return str;
};

const getFormattedDate = (date, dateFormat, timeZone = defaultTimeZone) => {
	const format = dateFormat ?? getLocalDateFormat() ?? "DD/MM/YYYY";

	return dayjs(date).tz(timeZone).format(format);
};

const parseDynamicVariable = (questionId, participant) => {
	const answerValue = participant.answers
		?.filter((a) => Boolean(a.question))
		.find((answer) => answer.question.id === questionId)?.value;
	return answerValue ?? "";
};

const parseParticipantVariable = async (variable, participant, timeInfo) => {
	switch (variable) {
		case "participant.fullName":
			return `${participant.name} ${participant.surname}`;
		case "participant.name":
			return participant.name;
		case "participant.surname":
			return participant.surname;
		case "participant.tagGroup":
			return participant?.tags?.[0]?.group?.name ?? "";
		case "participant.dayRestriction":
			return (
				participant?.tags
					?.filter((t) => Boolean(t.activeDate))
					?.map((t) =>
						getFormattedDate(
							t.activeDate,
							timeInfo?.dateFormat,
							timeInfo?.timeZone
						)
					)
					?.join(", ") ?? ""
			);
		case "participant.QR":
			return await qrcode.toDataURL(participant.participantNo);
		default:
			return parseDynamicVariable(variable, participant);
	}
};

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

socket.on("connect", () => {
	console.log(`Connected to server. Printer ID: ${clientPrinterId}`);
});

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
	getPdfFromHtml(htmlContent, fileName, width, height);
	printPdf(fileName);
};

socket.on("print", async (data) => {
	const { canvas, participant, printerId, timeInfo } = data;
	if (canvas && participant && `${printerId}` === `${clientPrinterId}`)
		await sendToPrinter(canvas, participant, timeInfo);
	else if (`${printerId}` === `${clientPrinterId}`)
		console.log(
			"Could not print",
			"Canvas:",
			Boolean(canvas),
			"Participant:",
			Boolean(participant)
		);
});

//creating menus for menu bar
const menuBarTemplate = [
	{
		label: config.appName,
		role: "appMenu",
	},
	{
		label: "File",
		submenu: [
			{
				label: "Open",
				accelerator: "CmdOrCtrl+O",
				click: function (item, focusedWindow) {
					if (focusedWindow) {
						handleOpenFile();
					}
				},
			},
			{
				label: "Open Containing Folder",
				accelerator: "CmdOrCtrl+F",
				click: function (item, focusedWindow) {
					if (focusedWindow && filepath) {
						shell.showItemInFolder(filepath);
					}
				},
			},
			{
				label: "Print",
				accelerator: "CmdOrCtrl+P",
				click: function (item, focusedWindow) {
					if (focusedWindow) focusedWindow.webContents.print();
				},
			},
			{
				label: "Close File",
				accelerator: "Shift+CmdOrCtrl+Z",
				click: function (item, focusedWindow) {
					if (focusedWindow)
						focusedWindow.loadURL(
							"file://" + __dirname + "/default.html",
							options
						);
				},
			},
			{ type: "separator" },
			{ role: "quit" },
		],
	},
	{
		label: "Edit",
		submenu: [
			{ role: "undo" },
			{ role: "redo" },
			{ type: "separator" },
			{ role: "copy" },
			{ role: "selectall" },
		],
	},
	{
		label: "View",
		submenu: [
			{ role: "reload" },
			{ role: "forceReload" },
			{ type: "separator" },
			{ role: "zoomIn" },
			{ role: "zoomOut" },
			{ role: "resetZoom" },
			{ type: "separator" },
			{ role: "togglefullscreen" },
		],
	},
	{
		label: "Window",
		role: "window",
		submenu: [
			{ label: "Minimize", accelerator: "CmdOrCtrl+M", role: "minimize" },
		],
	},
	{
		label: "Help",
		role: "help",
		submenu: [
			{
				label: "About",
				click: function () {
					dialog.showMessageBox(mainWindow, {
						type: "info",
						buttons: ["OK"],
						title: config.appName,
						message: "Version " + config.appVersion,
						detail: "Created By - " + config.author,
						icon: appIcon,
					});
				},
			},
			{
				label: "Learn More",
				click: function () {
					shell.openExternal(
						"https://github.com/praharshjain/Electron-PDF-Viewer"
					);
				},
			},
		],
	},
];
const contextMenuTemplate = [
	{ label: "Minimize", type: "radio", role: "minimize" },
	{ type: "separator" },
	{ label: "Exit", type: "radio", role: "quit" },
];

const menu = Menu.buildFromTemplate(menuBarTemplate);
app.setName(config.appName);
app.setAboutPanelOptions({
	applicationName: config.appName,
	applicationVersion: config.appVersion,
	copyright: config.copyrightInfo,
	version: config.appVersion,
	credits: config.author,
	authors: [config.author],
	website: config.website,
	iconPath: config.iconPath,
});
crashReporter.start({
	productName: config.appName,
	companyName: config.author,
	submitURL: config.website,
	autoSubmit: false,
});
forceSingleInstance();

// Function to handle command-line arguments
function handleCommandLineArgs() {
	const args = process.argv.slice(2); // Get arguments passed to Electron app
	if (args.includes("--print") && args.length > 1) {
		const filePath = args[args.indexOf("--print") + 1];
		printPdfAndLoad(filePath);
	}
}

function printPdf(filePath) {
	if (!fs.existsSync(filePath)) {
		console.error(`File does not exist: ${filePath}`);
		return;
	}
	print(filePath, { orientation: "landscape" });
}

function printPdfAndLoad(filePath) {
	if (!fs.existsSync(filePath)) {
		console.error(`File does not exist: ${filePath}`);
		return;
	}
	if (mainWindow) {
		const viewerPath = path.join(__dirname, "pdfviewer", "web", "viewer.html");
		const encodedPath = encodeURIComponent(`file://${filePath}`);
		const fullURL = `file://${viewerPath}?file=${encodedPath}`;

		console.log(`Loading URL: ${fullURL}`);
		mainWindow.loadURL(fullURL);

		mainWindow.webContents.once("did-finish-load", () => {
			print(filePath, { orientation: "landscape" });
		});
	} else {
		console.error(`mainWindow not ready: ${filePath}`);
	}
}

app.on("ready", function () {
	showSplashWindow();
	let tray = new Tray(trayIcon);
	contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
	tray.setToolTip(config.appName);
	tray.setContextMenu(contextMenu);
	Menu.setApplicationMenu(menu);
	//for OS-X
	if (app.dock) {
		app.dock.setIcon(appIcon);
		app.dock.setMenu(contextMenu);
	}
	createMainWindow();
});

// Quit when all windows are closed.
app.on("window-all-closed", function () {
	if (!isOSX()) {
		app.quit();
	}
});

app.on("activate", function () {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createMainWindow();
	}
});

function resetWindow(window) {
	if (window == null) {
		return;
	}
	window.webContents.closeDevTools();
	window.webContents.clearHistory();
	if (window.webContents.session) {
		window.webContents.session.clearAuthCache();
		window.webContents.session.clearCache();
		window.webContents.session.clearHostResolverCache();
		window.webContents.session.clearStorageData();
		window.webContents.session.closeAllConnections();
	}
}

function isOSX() {
	return process.platform !== "darwin";
}

function forceSingleInstance() {
	if (!app.requestSingleInstanceLock()) {
		app.quit();
	} else {
		app.on("second-instance", (event, commandLine, workingDirectory) => {
			// Someone tried to run a second instance, we should focus our window.
			if (mainWindow) {
				if (mainWindow.isMinimized()) {
					mainWindow.restore();
				}
				mainWindow.focus();
			}
		});
	}
}

function showSplashWindow() {
	splashwindow = new BrowserWindow({
		accessibleTitle: config.appName,
		title: config.appName,
		icon: config.appIcon,
		width: 400,
		height: 300,
		center: true,
		resizable: false,
		movable: false,
		alwaysOnTop: true,
		skipTaskbar: true,
		frame: false,
	});
	splashwindow.setIcon(appIcon);
	splashwindow.setOverlayIcon(appIcon, config.appName);
	splashwindow.loadURL("file://" + __dirname + "/splash.html", options);
}

function hideSplashWindow() {
	splashwindow.close();
	splashwindow = null;
}

function createMainWindow() {
	// Create the main window.
	mainWindow = new BrowserWindow({
		accessibleTitle: config.appName,
		title: config.appName,
		icon: appIcon,
		minWidth: 400,
		minHeight: 300,
		width: 800,
		height: 600,
		show: false,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			defaultEncoding: "UTF-8",
		},
	});
	mainWindow.setIcon(appIcon);
	mainWindow.setOverlayIcon(appIcon, config.appName);
	resetWindow(mainWindow);
	mainWindow.on("close", function (e) {
		mainWindow.webContents.clearHistory();
		mainWindow.webContents.session.clearCache(function () {
			mainWindow.destroy();
		});
	});
	mainWindow.on("closed", function () {
		mainWindow = null;
		app.quit();
	});
	mainWindow.webContents.on("new-window", function (e, url) {
		e.preventDefault();
		shell.openExternal(url);
	});
	mainWindow.webContents.on("devtools-opened", function (e) {
		// e.preventDefault();
		// this.closeDevTools();
	});
	mainWindow.webContents.on("will-navigate", function (e, url) {
		e.preventDefault();
		shell.openExternal(url);
	});
	mainWindow.loadURL("file://" + __dirname + "/default.html", options);
	ipcMain.handle(
		"setDefaultPrinter",
		async (_event, printerId) => await setDefaultPrinter(printerId)
	);
	mainWindow.once("ready-to-show", async () => {
		hideSplashWindow();
		mainWindow.maximize();
		mainWindow.show();
		mainWindow.focus();
		mainWindow.webContents.openDevTools();

		mainWindow.webContents.send("printers", {
			printers: await getPrinters(),
			defaultPrinter: await getDefaultPrinter(),
		});
	});
	handleCommandLineArgs(); // Handle the CLI arguments
}

function handleOpenFile() {
	let path = dialog.showOpenDialogSync({
		filters: [{ name: "PDF", extensions: ["pdf"] }],
		properties: ["openFile"],
	});
	if (path) {
		if (path.constructor === Array) path = path[0];
		filepath = path;
		mainWindow.loadURL(
			"file://" +
				__dirname +
				"/pdfviewer/web/viewer.html?file=" +
				encodeURIComponent(filepath),
			options
		);
	}
}
