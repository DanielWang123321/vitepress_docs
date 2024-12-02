import {
    join,
    relative
} from 'node:path';
import process from 'node:process';
import fse from 'fs-extra';
import pc from 'picocolors';
import {
    isValidUrl,
    createProgress,
    Printer,
    writeFileSafe
} from 'html-export-pdf-cli';
import {
    platform
} from 'node:os';
import multimatch from 'multimatch';
import 'semver';
import {
    mergePDFs
} from '@condorhero/merge-pdfs';
import pdf from 'pdfjs';
import 'cac';
import 'bundle-require';
import 'envinfo';
import 'ora';

const DOS_DEVICE_PATH_RE = /^\\\\(?<path>[.?])/;
const WINDOWS_BACKSLASHES_RE = /\\(?![!()+@{}])/g;

function convertPathToPosix(path) {
    return platform() === "win32" ? path.replace(DOS_DEVICE_PATH_RE, "//$1").replaceAll(WINDOWS_BACKSLASHES_RE, "/") : path;
}

function filterRoute(pages, routePatterns) {
    const pagePaths = multimatch(pages.map(({
        path
    }) => path), routePatterns);
    return pages.filter(({
        path
    }) => pagePaths.includes(path));
}

async function mergePDF(pages, outFile, outDir, pdfOutlines = true) {
    const saveDirPath = join(process.cwd(), outDir);
    outDir && fse.ensureDirSync(saveDirPath);
    const saveFilePath = join(saveDirPath, outFile);
    if (pages.length === 0) {
        process.stdout.write(pc.red("The website has no pages, please check whether the export path is set correctly"));
        process.exit(1);
    } else if (pages.length === 1) {
        fse.moveSync(pages[0].pagePath, saveFilePath, {
            overwrite: true
        });
    } else {
        let pdfData;
        if (pdfOutlines) {
            pdfData = await mergePDFs(pages.map(({
                pagePath
            }) => {
                const relativePagePath = relative(process.cwd(), pagePath);
                return convertPathToPosix(relativePagePath);
            }));
        } else {
            const doc = new pdf.Document();
            pages.map(({
                pagePath
            }) => fse.readFileSync(pagePath)).forEach((pdfFileItem) => {
                const pageFile = new pdf.ExternalDocument(pdfFileItem);
                doc.addPagesOf(pageFile);
            });
            pdfData = await doc.asBuffer();
        }
        fse.writeFileSync(saveFilePath, pdfData, {
            encoding: "binary"
        });
    }
    return relative(process.cwd(), saveFilePath);
}

async function generatePdf({
    pages,
    tempDir,
    port,
    host,
    sorter,
    outFile,
    outDir,
    urlOrigin,
    pdfOptions,
    pdfOutlines,
    routePatterns,
    puppeteerLaunchOptions,
    outlineContainerSelector
}) {
    const tempPdfDir = join(tempDir, "pdf");
    fse.ensureDirSync(tempPdfDir);
    let exportPages = filterRoute(pages, routePatterns);
    if (typeof sorter === "function")
        exportPages = exportPages.sort(sorter);
    const isValidUrlOrigin = isValidUrl(urlOrigin ?? "");
    if (urlOrigin && !isValidUrlOrigin) {
        process.stdout.write(pc.red(`${urlOrigin} is not a valid URL`));
        process.exit(1);
    }
    let userURLOrigin = "";
    if (urlOrigin && isValidUrlOrigin)
        userURLOrigin = new URL(urlOrigin).origin;
    const localURLOrigin = `${host}:${port}`;
    const normalizePages = exportPages.map((page) => {
        return {
            url: page.path,
            title: page.title,
            location: urlOrigin ? `${userURLOrigin}${page.path}` : `http://${localURLOrigin}${page.path}`,
            pagePath: `${tempPdfDir}/${page.key}.pdf`
        };
    });
    const singleBar = createProgress();
    singleBar.start(normalizePages.length);
    const printer = new Printer({
        outlineContainerSelector
    });
    await printer.setup(puppeteerLaunchOptions);
    for (const {
            location,
            pagePath,
            title
        } of normalizePages) {
        const page = await printer.createNewPage(location);
        if (urlOrigin && isValidUrlOrigin) {
            await page.setRequestInterception(true);
            page.on("request", (request) => {
                const reqUrl = request.url();
                if (isValidUrl(reqUrl)) {
                    const parsedUrl = new URL(reqUrl);
                    if (userURLOrigin === parsedUrl.origin) {
                        parsedUrl.host = host;
                        parsedUrl.protocol = "http:";
                        parsedUrl.port = `${port}`;
                        const parsedUrlString = parsedUrl.toString();
                        request.continue({
                            url: parsedUrlString,
                            headers: Object.assign({},
                                request.headers(), {
                                    refer: parsedUrlString
                                    // Same origin
                                    // origin: parsedUrl.origin,
                                    // CORS
                                    // host: parsedUrl.host,
                                }
                            )
                        });
                    } else {
                        request.continue();
                    }
                } else {
                    request.continue();
                }
            });
        }
        await printer.render(location);
        const headTitle = title || await page.title();
        const data = await printer.pdf(location, {
            format: "A4",
            ...pdfOptions
        });
        await writeFileSafe(pagePath, data);
        await printer.closePage(location);
        singleBar.increment(1, {
            headTitle
        });
    }
    singleBar.stop();
    await printer.closeBrowser();
    const exportedPath = await mergePDF(normalizePages, outFile, outDir, pdfOutlines);
    const message = `
Exported to ${pc.yellow(exportedPath)}
`;
    process.stdout.write(message);
    fse.removeSync(tempPdfDir);
    !fse.readdirSync(tempDir).length && fse.removeSync(tempDir);
    return exportedPath;
}

export {
    convertPathToPosix as c, filterRoute as f, generatePdf as g, mergePDF as m
};