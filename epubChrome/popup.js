
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById('generateEpub').addEventListener('click', process);
});

async function process() {
    displayMsg();
    const url = await getActiveTabUrl();
    // console.log("Active Tab URL: " + url);

    const content = await fetchHtml(url);
    // console.log("content", content);

    const tableOfContents = getContentUrls(content);
    fetchAllSubText(tableOfContents, url).then(text => {
        saveStringToFile(text, "epub");
        console.log("after save...");
        hideMsg();
    });

}

function displayMsg(msg) {
    if (msg)
        document.getElementById("myMsg").textContent = msg;
    document.getElementById("myModal").style.display = "block";
}

function hideMsg() {
    document.getElementById("myModal").style.display = "none";
}

async function fetchAllSubText(tableOfContents, url) {
    let text = "";
    tableOfContents = tableOfContents.filter((element, index) => index < 20);
    for (const node of tableOfContents) {
        displayMsg("downloading " + node.textContent);
        const subText = await fetchSubText(url, node);
        text += subText;
        console.log("", node.textContent, subText.length);
    }
    return text
}

async function fetchSubText(url, node) {
    return new Promise(async (resolve, reject) => {
        const subTextUrl = combineURL(url, node.getAttribute("href"));
        try {
            const subTextHtml = await fetchHtml(subTextUrl);
            const nodes = extractContentUsingXPath(subTextHtml, "//div[@class='zwzw']")
            let subText = "";
            nodes.forEach(node => subText += node.textContent);
            resolve(subText);
        } catch (error) {
            console.log("error when fetching ", subTexturl, error);
            reject(error);
        }
    });
}

function combineURL(activeTabUrl, relativePath) {
    const currentURL = new URL(activeTabUrl);
    const baseURL = currentURL.origin;
    return new URL(relativePath, baseURL).href;
}

function getContentUrls(content) {
    const xpathTableOfContent = document.getElementById("tableOfContent_xpath").value;
    let tableOfContents = extractContentUsingXPath(content, xpathTableOfContent);

    const keywordTableOfContent = document.getElementById("tableOfContent_keyword").value;

    tableOfContents = tableOfContents.filter(node => {
        return node.textContent.includes(keywordTableOfContent);
    });

    return tableOfContents;
}

async function getActiveTabUrl() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length > 0) {
                const activeTab = tabs[0];
                const activeTabUrl = activeTab.url;
                resolve(activeTabUrl);
            } else {
                reject(new Error('No active tab found.'));
            }
        });
    });
}


async function fetchHtml(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const content = await response.text(); // or response.json() if the content is in JSON format
        return content;
    } catch (error) {
        console.error('Error fetching content:', error);
        return null; // or throw the error if you prefer
    }
}

function extractContentUsingXPath(html, xpathExpression) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(html, "text/html");
    const result = [];
    const xpathResult = document.evaluate(
        xpathExpression,
        xmlDoc,
        null,
        XPathResult.ORDERED_NODE_ITERATOR_TYPE,
        null
    );

    let node = xpathResult.iterateNext();
    while (node) {
        result.push(node);
        node = xpathResult.iterateNext();
    }

    return result;
}

function saveStringToFile(data, filename) {
    const blob = new Blob([data], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
    });
}



