var clickedElement = null;

function getLocator(element) {
    const CLEAN_DOCUMENT = getCleanDocument();

    function find(element){
        const elementList = CLEAN_DOCUMENT.querySelectorAll(element.tagName);

        for(let candidate of elementList){
            if(candidate.original === element){
                return candidate;
            }
        }

        return null;
    }

    function findByText(tagName, text, strict){
        return Array.from(CLEAN_DOCUMENT.querySelectorAll(tagName)).filter(e => getElementText(e, strict) === text);
    }

    function isUniqueByText(tagName, text, strict){
        return findByText(tagName, text, strict).length === 1;
    }

    function getHPath(element){
        if(!element){
            return '<Target element is NULL!>';
        }

        const target = find(element, CLEAN_DOCUMENT);

        if(!target){
            return '<Target element is not displayed!>';
        }

        const steps = [];

        let current = target;
        while (current) {
            const step = computeStep(current);
            if (!step.text) break;

            steps.unshift(step);
            if (step.isOptimized) break;

            if(step.isSkipParent){
                current = current.parentNode;
            }

            if(current){
                current = current.parentNode;
            } 
        }

        return (steps.length && steps[0].isOptimized ? '' : '/') + steps.map(s => s.text).join('/');
    }

    function computeStep(element) {
        let step = '';
        let properties = '';
        let optimized = false;
        let skipParent = false;

        switch (element.nodeType){
            case Node.ELEMENT_NODE:
                step =  element.localName;
                [skipParent, optimized, properties] = computeProperties(element);
                break;

            case Node.TEXT_NODE:
            case Node.CDATA_SECTION_NODE:
                step = 'text()';
                break;
        }

        if (properties) step += '[' + properties + ']';
        if (optimized) step = '//' + step;

        return {text: step, isOptimized: optimized, isSkipParent: skipParent};
    }

    function computeProperties(element){
        if(isClickable(element)){
            const text = getElementText(element);
            if(text) return [false, isUniqueByText(element.tagName, text, true), 'text()="' + text + '"'];
        }

        if(isInput(element.tagName)){
            const label = getLabel(element);
            if(label.text) return [label.isParent, isUniqueByText('label', label.text, false), 'label()="' + label.text + '"'];
        }

        if(hasTagName('table', element)){
            const caption = getCaption(element);
            if(caption) return [false, isUniqueByText('caption', caption, true), 'caption()="' + caption + '"'];
        }

        if(hasTagName('fieldset',element)){
            const caption = getLegend(element);
            if(caption) return [false, isUniqueByText('legend', caption, true), 'legend()="' + caption + '"'];
        }

        if(hasTagName('figure', element)){
            const caption = getFigCaption(element);
            if(caption) return [false, isUniqueByText('figCaption', caption, true), 'figCaption()="' + caption + '"'];
        }

        const position = computePosition(element);
        if(position > 0) return [false, false, position];

        return [false, false, ''];
    }

    function isClickable(element){
        if(hasTagName('a', element)){
            return true;
        }
        
        if(hasTagName('button', element)){
            return true;
        }

        if(hasTagName('input', element)){
            const type = element.getAttribute("type");
            if(type === 'button' || type === 'submit'){
                return true;
            }
        }

        return false;
    }

    function computePosition(element) {
        const siblings = element.parentNode ? element.parentNode.children : null;

        if (!siblings) return 0;
        if (!hasSameNameSiblings(element, siblings)) return 0;

        let ownIndex = 1;
        for (let i = 0; i < siblings.length; ++i) {
            if (areNodesSimilar(element, siblings[i])) {
                if (siblings[i] === element){
                    return ownIndex;
                }
                ++ownIndex;
            }
        }

        return -1;
    }

    function hasSameNameSiblings(element, siblings){
        for (let i = 0; i < siblings.length; ++i) {
            if (areNodesSimilar(element, siblings[i]) && siblings[i] !== element) return true;
        }

        return false;
    }

    function areNodesSimilar(left, right) {
        if (left === right) return true;
        if (left.nodeType === Node.ELEMENT_NODE && right.nodeType === Node.ELEMENT_NODE) return left.localName === right.localName;
        if (left.nodeType === right.nodeType) return true;

        const leftType = left.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : left.nodeType;
        const rightType = right.nodeType === Node.CDATA_SECTION_NODE ? Node.TEXT_NODE : right.nodeType;

        return leftType === rightType;
    }

    return getHPath(element);
}

function getCleanDocument(){
    const PRECISION = 0.0001;

    const REMOVABLE_TYPE = ["div"];

    const ATTRIBUTE_AFFECT_PAINTING = ["all", "backface-visibility", "background", "background-blend-mode", "background-clip", "background-color", "background-image", "background-origin",
        "background-position", "background-repeat", "background-size", "box-shadow", "color", "column-rule", "column-rule-color", "column-rule-style", "column-rule-width",
        "empty-cells", "filter", "font", "font-family", "font-feature-settings", "font-size", "font-stretch", "font-style", "font-variant", "font-weight", "list-style",
        "list-style-image", "list-style-type", "mask", "mask-type", "max-height", "max-width", "mix-blend-mode", "opacity", "outline", "outline-color", "outline-offset",
        "outline-style", "outline-width", "perspective", "quotes", "text-decoration", "text-decoration-color", "text-decoration-line", "text-decoration-style",
        "text-underline-position", "transform", "transform-style"];

    const ATTRIBUTE_AFFECT_BORDERS = ["border", "border-bottom", "border-bottom-color", "border-bottom-left-radius", "border-bottom-right-radius", "border-bottom-style", "border-bottom-width",
        "border-color", "border-image", "border-image-outset", "border-image-repeat", "border-image-slice", "border-image-source", "border-image-width", "border-left",
        "border-left-color", "border-left-style", "border-left-width", "border-radius", "border-right", "border-right-color", "border-right-style", "border-right-width",
        "border-style", "border-top", "border-top-color", "border-top-left-radius", "border-top-right-radius", "border-top-style", "border-top-width", "border-width"];

    const DEFAULT_PROPERTIES = new Map();

    function addDefaultProperties(type){
        const appended = document.body.appendChild(document.createElement(type));
        const computedStyles = window.getComputedStyle(appended);

        const styles = new Map();
        for(let property of computedStyles){
            styles.set(property, computedStyles.getPropertyValue(property));
        }

        DEFAULT_PROPERTIES.set(type, styles);
        document.body.removeChild(appended);
    }

    function getDefaultProperty(node, property){
        if(!(node.nodeType === Node.ELEMENT_NODE )){
            return "";
        }

        const type = node.tagName.toLowerCase();

        if(!DEFAULT_PROPERTIES.has(type)){
            addDefaultProperties(type);
        }

        return DEFAULT_PROPERTIES.get(type).has(property) ? DEFAULT_PROPERTIES.get(type).get(property) : "";
    }

    function isDefaultProperty(node, property){
        if(!(node.nodeType === Node.ELEMENT_NODE )){
            return false;
        }

        return getDefaultProperty(node, property) === window.getComputedStyle(node).getPropertyValue(property);
    }

    function clean(node){
        if(node.childNodes.length === 0){
            if(isEmptyTextNode(node)){
                return [];
            }

            return [copyNode(node)];
        }

        let cleanChildren = [];
        for(let child of node.childNodes){
            cleanChildren = cleanChildren.concat(clean(child));
        }

        if(keep(node)){
            return [createNode(node, cleanChildren)];
        }

        return cleanChildren;
    }

    function keep(node){
        if(isEmptyTextNode(node)){
            return false;
        }

        if(!isRemovable(node)){
            return true;
        }

        if(hasTextNode(node)){
            return true;
        }

        return isAffectDisplay(node);
    }

    function createNode(node, children){
        const parent = copyNode(node);

        if(children.length === 1 && isSameTag(parent, children[0]) && isSameBorder(parent.original, children[0].original)){
            appendAttributes(parent, children[0].attributes);

            while (children[0].childNodes.length > 0){
                parent.appendChild(children[0].childNodes[0]);
            }
        }
        else {
            for (let child of children){
                parent.appendChild(child);
            }
        }

        return parent;
    }

    function copyNode(node){
        const copied = node.cloneNode(false);
        copied.original = node;

        return copied;
    }

    function isRemovable(node){
        return REMOVABLE_TYPE.includes(node.tagName.toLowerCase());
    }

    function hasTextNode(node){
        for(let child of node.childNodes){
            if(node.nodeType === Node.TEXT_NODE && !isEmptyTextNode(child)){
                return true;
            }
        }

        return false;
    }

    function appendAttributes(node, attributes){
        for(let attribute of attributes){
            const oldValue = node.getAttribute(attribute.name) ? node.getAttribute(attribute.name) : "";
            const newValue = oldValue + " " + attribute.value;

            node.setAttribute(attribute.name, newValue);
        }
    }

    function isSameTag(node1, node2){
        if(!(node1.nodeType === Node.ELEMENT_NODE ) || !(node2.nodeType === Node.ELEMENT_NODE )){
            return false;
        }

        return node1.tagName.toLowerCase() === node2.tagName.toLowerCase();
    }

    function isAffectDisplay(node){
        if(!hasAttributes(node)){
            return false;
        }

        return getUniqueStyles(node).size !== 0;
    }

    function getUniqueStyles(node){
        const styles = new Map();

        const computedStyles = window.getComputedStyle(node);
        const length = computedStyles.length;

        let index = 0;
        while(index < length){
            const name = computedStyles[index++];
            const property = computedStyles.getPropertyValue(name);

            if((isBorderProperty(name) && !isDefaultProperty(node, name)) || (isPaintingProperty(name) && !isInheritedProperty(node, name))){
                styles.set(name, property);
            }
        }

        return styles;
    }

    function isInheritedProperty(node, property){
        if(!(node.nodeType === Node.ELEMENT_NODE )){
            return false;
        }

        if(!node.parent){
            return isDefaultProperty(node, property);
        }

        return window.getComputedStyle(node).getPropertyValue(property) === window.getComputedStyle(node.parentElement).getPropertyValue(property);
    }

    function isSameBorder(node1, node2){
        const rect1 = getBoundingRectangle(node1);
        const rect2 = getBoundingRectangle(node2);

        if(!rect1 || !rect2){
            return false;
        }

        return equalsFloat(rect1.left, rect2.left)
            && equalsFloat(rect1.offsetWidth, rect2.offsetWidth)
            && equalsFloat(rect1.top, rect2.top)
            && equalsFloat(rect1.offsetHeight, rect2.offsetHeight);
    }

    function getBoundingRectangle(node){
        if(!(node.nodeType === Node.ELEMENT_NODE )){
            return null;
        }

        const border = getBorderWidth(node);

        let rectangle = {};
        rectangle.left = node.offsetLeft + border.left;
        rectangle.offsetWidth = node.offsetWidth - border.left - border.right;
        rectangle.top = node.offsetTop + border.top;
        rectangle.offsetHeight = node.offsetHeight - border.top - border.bottom;

        return rectangle;
    }

    function getBorderWidth(node){
        let borders = {};

        borders.left = getPropertyInPixels(node, "border-left-width");
        borders.right = getPropertyInPixels(node, "border-right-width");
        borders.top = getPropertyInPixels(node, "border-top-width");
        borders.bottom = getPropertyInPixels(node, "border-bottom-width");

        return borders;
    }

    function getPropertyInPixels(node, property){
        return Math.round(parseFloat(window.getComputedStyle(node, null).getPropertyValue(property).slice(0, -2)));
    }

    function equalsFloat(x, y){
        return Math.abs(x - y) <= PRECISION;
    }

    function hasAttributes(node){
        return node.attributes.length > 0;
    }

    function isPaintingProperty(name){
        return ATTRIBUTE_AFFECT_PAINTING.includes(name);
    }

    function isBorderProperty(name){
        return ATTRIBUTE_AFFECT_BORDERS.includes(name);
    }

    return clean(document.documentElement)[0];
}


function isEmptyTextNode(node){

    if(node.nodeType !== Node.TEXT_NODE){
        return false;
    }

    const isWhiteSpace = c => 9 === c || 32 === c || 0xB === c || 0xC === c || 10 === c || 13 === c;
    const length = node.nodeValue.length;

    let index = 0;

    while(index < length) {
        if(!isWhiteSpace(node.nodeValue.charCodeAt(index++))){
            return false;
        }
    }

    return true;
}


function getLabel(element){
    if(element.parentElement === null){
        return null;
    }

    let label = null;
    let isParent = false;

    if(element.parentElement.tagName.toLowerCase() === 'label'){
        label = getElementText(element.parentElement, false);
        isParent = true;
    }
    else if(element.hasAttribute('id')){
        const labels = getSiblings(element, 'label')
            .filter(s => s.hasAttribute('for'))
            .filter(s => s.getAttribute('for') === element.getAttribute('id'));

        if(labels.length === 1){
            label = getElementText(labels[0]);
        }
    }

    return label ? {text: label.trim(), isParent: isParent} : {text:null, isParent: false};
}


function getCaption(element){
    return getGenericCaption('caption', element);
}


function getLegend(element){
    return getGenericCaption('legend', element);
}


function getFigCaption(element){
    return getGenericCaption('figcaption', element);
}


function getGenericCaption(tagName, element){
    const children = getChildElements(element, tagName);
    let text = null;

    if(children.length === 1){
        text = getElementText(children[0]);
    }

    return text ? text.trim() : null;
}

function getElementText(element, strict = true){
    const formattingElements = ['b', 'strong', 'i', 'em', 'mark', 'small', 'del', 'ins', 'sub', 'sup', 'a', 'span'];

    let text = '';

    let child  = element.firstChild;

    while(child){
        if (child.nodeType === Node.TEXT_NODE && !isEmptyTextNode(child)) {
            text += ' ' + child.textContent.trim();
        }
        else if(child.nodeType === Node.ELEMENT_NODE && formattingElements.includes(child.tagName.toLowerCase())){
            text += getElementText(child);
        }
        else if(strict && child.nodeType === Node.ELEMENT_NODE){
            return null;
        }

        child = child.nextSibling;
    }

    return text.trim();
}


function getSiblings(element, tagName = null){
    if(!element.parentNode) {
        return [];
    }

    return getChildElements(element.parentNode, tagName).filter(e => e !== element);
}

function getChildElements(element, tagName = null){
    const children = [];
    let child  = element.firstChild;

    while (child) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            children.push(child);
        }

        child = child.nextSibling;
    }

    if(tagName){
        return children.filter(e => hasTagName(tagName, e));
    }

    return children;
}

function hasTagName(tagName, element){
    return element.tagName.toLowerCase() === tagName.toLowerCase();
}

function isInput(tagName){
    return ['input', 'select', 'textarea',  'button', 'option'].includes(tagName.toLowerCase());
}

function copyTextToClipboard(text) {
    const copyFrom = document.createElement("textarea");

    copyFrom.textContent = text;
    document.body.appendChild(copyFrom);
    copyFrom.select();
  
    document.execCommand('copy');
  
    copyFrom.blur();
    document.body.removeChild(copyFrom);
  }


document.addEventListener("contextmenu", function(event){
    clickedElement = event.target;
}, true);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request == "getClickedElement") {
        const hPath = getLocator(clickedElement);
        copyTextToClipboard(hPath)
    }
});