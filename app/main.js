const electron = require("electron");
const config = require("./config");
const { io } = require("socket.io-client");
const { Launcher } = require("chrome-launcher");
const chromium = require("chromium");
const fs = require("fs");
const path = require("path");
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
	getPrinters,
	getDefaultPrinter,
	setDefaultPrinter,
} = require("nodejs-printer");
const { default: sendToPrinter } = require("./utils/printer");
let mainWindow, splashwindow;
let contextMenu = null;
let filepath = null;

const socket = io("https://beta-api.kapital.com.tr", {
	autoConnect: true,
});

const userDataPath = app.getPath("userData");
const pdfsDir = path.join(userDataPath, "pdfs");
const printerIdPath = path.join(userDataPath, "printerId.txt");
const chromePathTxt = path.join(userDataPath, "chromePath.txt");

const readSavedPrinterId = () => {
	try {
		const id = fs.readFileSync(printerIdPath, "utf8");
		return id?.trim();
	} catch (err) {
		return null;
	}
};

const readSavedChromePath = () => {
	try {
		const id = fs.readFileSync(chromePathTxt, "utf8");
		return id?.trim();
	} catch (err) {
		return null;
	}
};

const writePrinterId = (printerId) => {
	try {
		fs.writeFileSync(printerIdPath, printerId);
	} catch (err) {}
};

const writeChromePath = (path) => {
	try {
		fs.writeFileSync(chromePathTxt, path);
	} catch (err) {}
};

const getChromePath = () =>
	readSavedChromePath() ?? Launcher.getInstallations()?.[0];

if (!fs.existsSync(pdfsDir)) {
	fs.mkdirSync(pdfsDir);
}

const deletePdfs = () => {
	try {
		fs.rmSync(pdfsDir, { recursive: true, force: true });
	} catch (error) {
		console.log(error);
	}
};

const quit = () => {
	deletePdfs();
	app.quit();
};

const generatePrinterId = () =>
	`${Math.floor(100000 + Math.random() * 900000)}`;

const savedPrinterId = readSavedPrinterId();
let clientPrinterId = savedPrinterId ?? generatePrinterId();
let chromePath = chromium?.path ?? readSavedChromePath() ?? getChromePath();

const resetPrinterId = (mainWindow) => {
	clientPrinterId = generatePrinterId();
	writePrinterId(clientPrinterId);
	mainWindow.webContents.send("printerId", clientPrinterId);
};

if (!savedPrinterId) {
	writePrinterId(clientPrinterId);
}

socket.on("connect", () => {
	console.log(`Connected to server. Printer ID: ${clientPrinterId}`);
});

socket.on("print", async (data) => {
	const { canvas, participant, printerId, timeInfo } = data;
	if (canvas && participant && `${printerId}` === `${clientPrinterId}`) {
		mainWindow.webContents.send("print", participant);
		await sendToPrinter(canvas, participant, timeInfo, pdfsDir, chromePath);
		mainWindow.webContents.send("pdfIframe", participant.participantNo);
	} else if (`${printerId}` === `${clientPrinterId}`)
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
			{
				label: "Exit",
				click: function (item, focusedWindow) {
					mainWindow.destroy();
					quit();
				},
			},
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
						"https://github.com/kapital-media/event-printer-electron"
					);
				},
			},
		],
	},
];
const contextMenuTemplate = [
	{
		label: "Show",
		click: function () {
			mainWindow.show();
		},
	},
	{ type: "separator" },
	{
		label: "Exit",
		click: function () {
			mainWindow.destroy();
			quit();
		},
	},
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

app.on("ready", function () {
	showSplashWindow();
	let tray = new Tray(trayIcon);
	contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
	tray.setToolTip(config.appName);
	tray.setContextMenu(contextMenu);
	tray.on("double-click", () => {
		mainWindow.show();
	});
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
		quit();
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
		quit();
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
	mainWindow.on("close", function (event) {
		if (!app.isQuiting) {
			event.preventDefault();
			mainWindow.hide();
		} else {
			mainWindow.webContents.clearHistory();
			mainWindow.webContents.session.clearCache(function () {
				mainWindow.destroy();
			});
		}
	});
	mainWindow.on("closed", function () {
		mainWindow = null;
		quit();
	});
	mainWindow.webContents.on("new-window", function (e, url) {
		e.preventDefault();
		shell.openExternal(url);
	});
	mainWindow.webContents.on("devtools-opened", function (e) {
		e.preventDefault();
		this.closeDevTools();
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
	ipcMain.handle("resetPrinterId", async (_event) =>
		resetPrinterId(mainWindow)
	);
	ipcMain.handle("setChromePath", async (_event, path) => {
		chromePath = path;
		writeChromePath(path);
	});
	mainWindow.once("ready-to-show", async () => {
		hideSplashWindow();
		mainWindow.maximize();
		mainWindow.show();
		mainWindow.focus();

		mainWindow.webContents.send("pdfsDir", pdfsDir);
		mainWindow.webContents.send("chromePath", chromePath);
		mainWindow.webContents.send("printerId", clientPrinterId);
		mainWindow.webContents.send("printers", {
			printers: await getPrinters(),
			defaultPrinter: await getDefaultPrinter(),
		});
	});
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
