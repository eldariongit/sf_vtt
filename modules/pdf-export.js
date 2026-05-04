const DEFAULT_PDF_OPTIONS = {
    format: 'a4',
    orientation: 'portrait',
    unit: 'pt'
};

function getJsPdfConstructor() {
    const jspdfGlobal = window.jspdf || window.jspPDF || window.jsPDF;
    if (!jspdfGlobal) return null;
    return typeof jspdfGlobal === 'function' ? jspdfGlobal : jspdfGlobal.jsPDF || jspdfGlobal;
}

function createHiddenExportContainer() {
    const container = document.createElement('div');
    container.className = 'sf_vtt sheet characterSheet';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '-9999px';
    container.style.width = '1200px';
    container.style.pointerEvents = 'none';
    container.style.opacity = '0';
    container.style.zIndex = '-1';
    document.body.appendChild(container);
    return container;
}

function clonePageWrappers(source) {
    const header = source.querySelector('.sheet.sheet-border.white-background:not(.scroller)');
    const tabs = Array.from(source.querySelectorAll('.tab'));

    if (!header || tabs.length === 0) {
        const clone = source.cloneNode(true);
        clone.className = 'sf_vtt sheet characterSheet';
        return [clone];
    }

    return tabs.map((tab) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'sf_vtt sheet characterSheet';
        wrapper.style.width = `${header.getBoundingClientRect().width}px`;
        wrapper.style.boxSizing = 'border-box';
        wrapper.style.padding = '0';
        wrapper.style.margin = '0';
        wrapper.style.background = '#ffffff';
        wrapper.style.color = '#000000';

        const headerClone = header.cloneNode(true);
        const exportButton = headerClone.querySelector('.export-pdf-btn');
        if (exportButton) {
            exportButton.remove();
        }

        const tabClone = tab.cloneNode(true);
        tabClone.style.display = 'block';
        tabClone.style.visibility = 'visible';

        wrapper.appendChild(headerClone);
        wrapper.appendChild(tabClone);
        return wrapper;
    });
}

async function renderElementToCanvas(element) {
    return window.html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
    });
}

export async function exportElementAsPdf(element, filename = 'export.pdf') {
    if (!element) {
        throw new Error('PDF export target element not found.');
    }

    const html2canvas = window.html2canvas;
    const jsPDFConstructor = getJsPdfConstructor();
    if (typeof html2canvas !== 'function') {
        throw new Error('html2canvas is not loaded. Ensure the script is included in system.json.');
    }
    if (typeof jsPDFConstructor !== 'function') {
        throw new Error('jsPDF is not loaded. Ensure the script is included in system.json.');
    }

    const pageWrappers = clonePageWrappers(element);
    const exportContainer = createHiddenExportContainer();

    try {
        pageWrappers.forEach((wrapper) => exportContainer.appendChild(wrapper));

        const pdf = new jsPDFConstructor(DEFAULT_PDF_OPTIONS);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        let isFirstPage = true;

        for (const wrapper of pageWrappers) {
            const canvas = await renderElementToCanvas(wrapper);
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const imgProps = pdf.getImageProperties(imgData);
            const imgWidth = pageWidth;
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            const totalPages = Math.ceil(imgHeight / pageHeight);

            for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
                if (!isFirstPage || pageIndex > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'JPEG', 0, -pageIndex * pageHeight, imgWidth, imgHeight);
            }

            isFirstPage = false;
        }

        pdf.save(filename);
    } finally {
        document.body.removeChild(exportContainer);
    }
}
