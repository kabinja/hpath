 function copyHPath(info, tab){
    chrome.tabs.sendMessage(tab.id, "getClickedElement", {frameId: info.frameId});
}

chrome.contextMenus.create({
    id: "copy-hpath",
    title: "Copy HPath", 
    contexts:["all"], 
    onclick: copyHPath
});

