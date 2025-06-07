// Tab functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            
            // Remove active class from all buttons and contents
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Initialize all tool functionality
    initMergePDF();
    initSplitPDF();
    initCompressPDF();
    initWordToPDF();
    initPPTToPDF();
    initExcelToPDF();
    initImageToPDF();
    initHTMLToPDF();
});

// Helper functions
function showLoading(message = 'Processing your file...') {
    const overlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    loadingText.textContent = message;
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function downloadFile(blob, filename) {
    saveAs(blob, filename);
}

function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Merge PDF functionality
function initMergePDF() {
    const mergeUpload = document.getElementById('merge-upload');
    const mergeFilesInput = document.getElementById('merge-files');
    const mergeFileList = document.getElementById('merge-file-list');
    const mergeBtn = document.getElementById('merge-btn');
    const mergeDownload = document.getElementById('merge-download');
    const mergeDownloadLink = document.getElementById('merge-download-link');
    
    let filesToMerge = [];
    
    // Handle file selection
    mergeFilesInput.addEventListener('change', function(e) {
        filesToMerge = Array.from(e.target.files);
        updateMergeFileList();
    });
    
    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        mergeUpload.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        mergeUpload.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        mergeUpload.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        mergeUpload.classList.add('highlight');
    }
    
    function unhighlight() {
        mergeUpload.classList.remove('highlight');
    }
    
    mergeUpload.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        filesToMerge = Array.from(dt.files).filter(file => file.type === 'application/pdf');
        updateMergeFileList();
    });
    
    function updateMergeFileList() {
        mergeFileList.innerHTML = '';
        
        if (filesToMerge.length === 0) {
            mergeBtn.disabled = true;
            return;
        }
        
        filesToMerge.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name} (${formatFileSize(file.size)})</span>
                <i class="fas fa-times" data-index="${index}"></i>
            `;
            mergeFileList.appendChild(fileItem);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.file-item i').forEach(icon => {
            icon.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                filesToMerge.splice(index, 1);
                updateMergeFileList();
            });
        });
        
        mergeBtn.disabled = filesToMerge.length < 2;
    }
    
    // Merge PDFs
    mergeBtn.addEventListener('click', async function() {
        if (filesToMerge.length < 2) return;
        
        showLoading('Merging PDF files...');
        
        try {
            const { PDFDocument } = PDFLib;
            const mergedPdf = await PDFDocument.create();
            
            for (const file of filesToMerge) {
                const fileBytes = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(fileBytes);
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
            }
            
            const mergedPdfBytes = await mergedPdf.save();
            const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            
            mergeDownloadLink.href = URL.createObjectURL(mergedBlob);
            mergeDownloadLink.download = 'merged.pdf';
            mergeDownload.style.display = 'block';
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error merging PDFs: ' + error.message);
            console.error(error);
        }
    });
}

// Split PDF functionality
function initSplitPDF() {
    const splitUpload = document.getElementById('split-upload');
    const splitFileInput = document.getElementById('split-file');
    const splitOptions = document.getElementById('split-options');
    const splitBtn = document.getElementById('split-btn');
    const splitDownload = document.getElementById('split-download');
    const splitDownloadLinks = document.getElementById('split-download-links');
    
    let pdfDoc = null;
    let totalPages = 0;
    
    // Handle file selection
    splitFileInput.addEventListener('change', async function(e) {
        if (e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file');
            return;
        }
        
        showLoading('Loading PDF file...');
        
        try {
            const { PDFDocument } = PDFLib;
            const fileBytes = await file.arrayBuffer();
            pdfDoc = await PDFDocument.load(fileBytes);
            totalPages = pdfDoc.getPageCount();
            
            splitOptions.style.display = 'block';
            splitBtn.disabled = false;
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error loading PDF: ' + error.message);
            console.error(error);
        }
    });
    
    // Split PDF
    splitBtn.addEventListener('click', async function() {
        if (!pdfDoc) return;
        
        showLoading('Splitting PDF file...');
        
        try {
            const { PDFDocument } = PDFLib;
            const splitMethod = document.querySelector('input[name="split-method"]:checked').value;
            
            if (splitMethod === 'range') {
                const rangesInput = document.getElementById('page-ranges').value.trim();
                if (!rangesInput) {
                    alert('Please enter page ranges');
                    hideLoading();
                    return;
                }
                
                // Parse page ranges (e.g., "1-3,5-7")
                const rangeGroups = rangesInput.split(',');
                const ranges = [];
                
                for (const group of rangeGroups) {
                    if (group.includes('-')) {
                        const [start, end] = group.split('-').map(num => parseInt(num.trim()));
                        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
                            alert(`Invalid range: ${group}. Please enter valid page numbers (1-${totalPages})`);
                            hideLoading();
                            return;
                        }
                        ranges.push({ start, end });
                    } else {
                        const page = parseInt(group.trim());
                        if (isNaN(page) || page < 1 || page > totalPages) {
                            alert(`Invalid page: ${group}. Please enter valid page numbers (1-${totalPages})`);
                            hideLoading();
                            return;
                        }
                        ranges.push({ start: page, end: page });
                    }
                }
                
                // Create separate PDFs for each range
                splitDownloadLinks.innerHTML = '';
                
                for (const range of ranges) {
                    const newPdf = await PDFDocument.create();
                    for (let i = range.start - 1; i < range.end; i++) {
                        const [page] = await newPdf.copyPages(pdfDoc, [i]);
                        newPdf.addPage(page);
                    }
                    
                    const pdfBytes = await newPdf.save();
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    
                    const link = document.createElement('a');
                    link.href = url;
                    link.className = 'download-btn';
                    link.download = `pages_${range.start}-${range.end}.pdf`;
                    link.innerHTML = `<i class="fas fa-download"></i> Download Pages ${range.start}-${range.end}`;
                    splitDownloadLinks.appendChild(link);
                    splitDownloadLinks.appendChild(document.createElement('br'));
                    splitDownloadLinks.appendChild(document.createElement('br'));
                }
                
            } else if (splitMethod === 'every') {
                const every = parseInt(document.getElementById('split-every').value);
                if (isNaN(every) || every < 1 || every > totalPages) {
                    alert(`Please enter a valid number between 1 and ${totalPages}`);
                    hideLoading();
                    return;
                }
                
                splitDownloadLinks.innerHTML = '';
                const numFiles = Math.ceil(totalPages / every);
                
                for (let i = 0; i < numFiles; i++) {
                    const newPdf = await PDFDocument.create();
                    const startPage = i * every;
                    const endPage = Math.min(startPage + every, totalPages);
                    
                    for (let j = startPage; j < endPage; j++) {
                        const [page] = await newPdf.copyPages(pdfDoc, [j]);
                        newPdf.addPage(page);
                    }
                    
                    const pdfBytes = await newPdf.save();
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    
                    const link = document.createElement('a');
                    link.href = url;
                    link.className = 'download-btn';
                    link.download = `pages_${startPage + 1}-${endPage}.pdf`;
                    link.innerHTML = `<i class="fas fa-download"></i> Download Pages ${startPage + 1}-${endPage}`;
                    splitDownloadLinks.appendChild(link);
                    splitDownloadLinks.appendChild(document.createElement('br'));
                    splitDownloadLinks.appendChild(document.createElement('br'));
                }
            }
            
            splitDownload.style.display = 'block';
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error splitting PDF: ' + error.message);
            console.error(error);
        }
    });
}

// Compress PDF functionality
function initCompressPDF() {
    const compressUpload = document.getElementById('compress-upload');
    const compressFileInput = document.getElementById('compress-file');
    const compressOptions = document.getElementById('compress-options');
    const originalSizeDisplay = document.getElementById('original-size');
    const compressBtn = document.getElementById('compress-btn');
    const compressDownload = document.getElementById('compress-download');
    const compressDownloadLink = document.getElementById('compress-download-link');
    const originalSizeFinal = document.getElementById('original-size-display');
    const compressedSize = document.getElementById('compressed-size');
    const reduction = document.getElementById('reduction');
    
    let originalPdfBytes = null;
    let originalSize = 0;
    
    // Handle file selection
    compressFileInput.addEventListener('change', async function(e) {
        if (e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        if (file.type !== 'application/pdf') {
            alert('Please select a PDF file');
            return;
        }
        
        originalPdfBytes = await file.arrayBuffer();
        originalSize = file.size;
        originalSizeDisplay.textContent = formatFileSize(originalSize);
        
        compressOptions.style.display = 'block';
        compressBtn.disabled = false;
    });
    
    // Compress PDF
    compressBtn.addEventListener('click', async function() {
        if (!originalPdfBytes) return;
        
        showLoading('Compressing PDF file...');
        
        try {
            const { PDFDocument } = PDFLib;
            const compressionLevel = document.querySelector('input[name="compression-level"]:checked').value;
            
            // Load the original PDF
            const pdfDoc = await PDFDocument.load(originalPdfBytes);
            
            // Set compression options based on selected level
            let quality;
            switch (compressionLevel) {
                case 'low':
                    quality = 0.9; // High quality
                    break;
                case 'medium':
                    quality = 0.7; // Balanced
                    break;
                case 'high':
                    quality = 0.5; // High compression
                    break;
                default:
                    quality = 0.7;
            }
            
            // Save with compression
            const compressedPdfBytes = await pdfDoc.save({
                useObjectStreams: true,
                // Note: PDF-Lib's compression options are limited in the browser
                // For better compression, a server-side solution would be needed
            });
            
            const compressedBlob = new Blob([compressedPdfBytes], { type: 'application/pdf' });
            const compressedSizeValue = compressedBlob.size;
            const reductionValue = ((originalSize - compressedSizeValue) / originalSize * 100).toFixed(2);
            
            // Update UI with results
            originalSizeFinal.textContent = formatFileSize(originalSize);
            compressedSize.textContent = formatFileSize(compressedSizeValue);
            reduction.textContent = reductionValue + '%';
            
            compressDownloadLink.href = URL.createObjectURL(compressedBlob);
            compressDownloadLink.download = 'compressed.pdf';
            compressDownload.style.display = 'block';
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error compressing PDF: ' + error.message);
            console.error(error);
        }
    });
}

// Word to PDF functionality
function initWordToPDF() {
    const wordUpload = document.getElementById('word-upload');
    const wordFileInput = document.getElementById('word-file');
    const wordBtn = document.getElementById('word-btn');
    const wordDownload = document.getElementById('word-download');
    const wordDownloadLink = document.getElementById('word-download-link');
    
    // Handle file selection
    wordFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const validTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            
            if (!validTypes.includes(file.type)) {
                alert('Please select a Word document (DOC or DOCX)');
                return;
            }
            
            wordBtn.disabled = false;
        }
    });
    
    // Convert Word to PDF
    wordBtn.addEventListener('click', async function() {
        const file = wordFileInput.files[0];
        if (!file) return;
        
        showLoading('Converting Word to PDF...');
        
        try {
            // Read the file as array buffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Convert Word to HTML using mammoth.js
            const result = await mammoth.extractRawText({ arrayBuffer });
            const text = result.value;
            
            // Create PDF from text using jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Split text into lines that fit the page
            const lines = doc.splitTextToSize(text, 180);
            
            // Add text to PDF
            doc.text(lines, 10, 10);
            
            // Generate PDF blob
            const pdfBlob = doc.output('blob');
            
            // Update download link
            wordDownloadLink.href = URL.createObjectURL(pdfBlob);
            wordDownloadLink.download = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
            wordDownload.style.display = 'block';
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error converting Word to PDF: ' + error.message);
            console.error(error);
        }
    });
}

// PowerPoint to PDF functionality
function initPPTToPDF() {
    const pptUpload = document.getElementById('ppt-upload');
    const pptFileInput = document.getElementById('ppt-file');
    const pptBtn = document.getElementById('ppt-btn');
    const pptDownload = document.getElementById('ppt-download');
    const pptDownloadLink = document.getElementById('ppt-download-link');
    
    // Handle file selection
    pptFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const validTypes = ['application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
            
            if (!validTypes.includes(file.type)) {
                alert('Please select a PowerPoint presentation (PPT or PPTX)');
                return;
            }
            
            pptBtn.disabled = false;
        }
    });
    
    // Convert PPT to PDF
    pptBtn.addEventListener('click', async function() {
        const file = pptFileInput.files[0];
        if (!file) return;
        
        showLoading('Converting PowerPoint to PDF...');
        
        try {
            // Note: PPT conversion in browser is limited
            // For better results, a server-side solution would be needed
            // This is a simplified approach that creates a PDF with slide images
            
            // Read the file as array buffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Create a PDF with jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Add a placeholder text since we can't convert PPT directly in the browser
            doc.text('PowerPoint to PDF conversion requires server-side processing.', 10, 10);
            doc.text('For a complete solution, please use a server-based converter.', 10, 20);
            
            // Generate PDF blob
            const pdfBlob = doc.output('blob');
            
            // Update download link
            pptDownloadLink.href = URL.createObjectURL(pdfBlob);
            pptDownloadLink.download = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
            pptDownload.style.display = 'block';
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error converting PowerPoint to PDF: ' + error.message);
            console.error(error);
        }
    });
}

// Excel to PDF functionality
function initExcelToPDF() {
    const excelUpload = document.getElementById('excel-upload');
    const excelFileInput = document.getElementById('excel-file');
    const excelBtn = document.getElementById('excel-btn');
    const excelDownload = document.getElementById('excel-download');
    const excelDownloadLink = document.getElementById('excel-download-link');
    
    // Handle file selection
    excelFileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            
            if (!validTypes.includes(file.type)) {
                alert('Please select an Excel spreadsheet (XLS or XLSX)');
                return;
            }
            
            excelBtn.disabled = false;
        }
    });
    
    // Convert Excel to PDF
    excelBtn.addEventListener('click', async function() {
        const file = excelFileInput.files[0];
        if (!file) return;
        
        showLoading('Converting Excel to PDF...');
        
        try {
            // Read the file as array buffer
            const arrayBuffer = await file.arrayBuffer();
            
            // Parse Excel file using SheetJS
            const workbook = XLSX.read(arrayBuffer);
            
            // Create PDF with jsPDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Process each worksheet
            workbook.SheetNames.forEach((sheetName, index) => {
                if (index > 0) doc.addPage(); // Add new page for each sheet after the first
                
                // Convert sheet to CSV
                const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                
                // Split CSV into lines
                const lines = csv.split('\n');
                
                // Add sheet name as title
                doc.text(sheetName, 10, 10);
                
                // Add CSV data
                let y = 20;
                for (let i = 0; i < Math.min(lines.length, 50); i++) { // Limit to 50 lines per sheet
                    doc.text(lines[i], 10, y);
                    y += 7;
                    if (y > 280) break; // Don't go past page height
                }
            });
            
            // Generate PDF blob
            const pdfBlob = doc.output('blob');
            
            // Update download link
            excelDownloadLink.href = URL.createObjectURL(pdfBlob);
            excelDownloadLink.download = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
            excelDownload.style.display = 'block';
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error converting Excel to PDF: ' + error.message);
            console.error(error);
        }
    });
}

// Image to PDF functionality
function initImageToPDF() {
    const imageUpload = document.getElementById('image-upload');
    const imageFilesInput = document.getElementById('image-files');
    const imageFileList = document.getElementById('image-file-list');
    const imageBtn = document.getElementById('image-btn');
    const imageDownload = document.getElementById('image-download');
    const imageDownloadLink = document.getElementById('image-download-link');
    
    let imageFiles = [];
    
    // Handle file selection
    imageFilesInput.addEventListener('change', function(e) {
        imageFiles = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
        updateImageFileList();
    });
    
    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        imageUpload.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        imageUpload.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        imageUpload.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        imageUpload.classList.add('highlight');
    }
    
    function unhighlight() {
        imageUpload.classList.remove('highlight');
    }
    
    imageUpload.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        imageFiles = Array.from(dt.files).filter(file => file.type.startsWith('image/'));
        updateImageFileList();
    });
    
    function updateImageFileList() {
        imageFileList.innerHTML = '';
        
        if (imageFiles.length === 0) {
            imageBtn.disabled = true;
            return;
        }
        
        imageFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span>${file.name} (${formatFileSize(file.size)})</span>
                <i class="fas fa-times" data-index="${index}"></i>
            `;
            imageFileList.appendChild(fileItem);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.file-item i').forEach(icon => {
            icon.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                imageFiles.splice(index, 1);
                updateImageFileList();
            });
        });
        
        imageBtn.disabled = imageFiles.length === 0;
    }
    
    // Convert Images to PDF
    imageBtn.addEventListener('click', async function() {
        if (imageFiles.length === 0) return;
        
        showLoading('Converting images to PDF...');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const pageSize = document.getElementById('image-page-size').value;
            const orientation = document.getElementById('image-orientation').value;
            const margin = parseInt(document.getElementById('image-margin').value);
            
            // Set PDF options
            let pdfOptions = {
                orientation: orientation,
                unit: 'mm'
            };
            
            // Set page size
            switch (pageSize) {
                case 'a4':
                    pdfOptions.format = 'a4';
                    break;
                case 'letter':
                    pdfOptions.format = [215.9, 279.4]; // Letter in mm
                    break;
                case 'a3':
                    pdfOptions.format = 'a3';
                    break;
                case 'a5':
                    pdfOptions.format = 'a5';
                    break;
                case 'fit':
                    // Will handle per image
                    break;
                default:
                    pdfOptions.format = 'a4';
            }
            
            // Process each image
            for (let i = 0; i < imageFiles.length; i++) {
                const file = imageFiles[i];
                
                if (i > 0) doc.addPage(); // Add new page for each image after the first
                
                const img = await createImageBitmap(file);
                let imgWidth = img.width;
                let imgHeight = img.height;
                
                // Calculate dimensions based on options
                let pageWidth, pageHeight;
                
                if (pageSize === 'fit') {
                    // Use image dimensions (converted to mm at 96 DPI)
                    pageWidth = (imgWidth / 96) * 25.4;
                    pageHeight = (imgHeight / 96) * 25.4;
                    doc = new jsPDF({
                        orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
                        unit: 'mm',
                        format: [pageWidth, pageHeight]
                    });
                    if (i > 0) doc.addPage(); // Re-add page for subsequent images
                } else {
                    // Get page dimensions from jsPDF
                    pageWidth = doc.internal.pageSize.getWidth();
                    pageHeight = doc.internal.pageSize.getHeight();
                    
                    // Calculate available space with margins
                    const availableWidth = pageWidth - (margin * 2);
                    const availableHeight = pageHeight - (margin * 2);
                    
                    // Calculate aspect ratio
                    const imgAspect = imgWidth / imgHeight;
                    const availableAspect = availableWidth / availableHeight;
                    
                    // Calculate final dimensions to fit within available space
                    let finalWidth, finalHeight;
                    
                    if (imgAspect > availableAspect) {
                        // Image is wider than available space
                        finalWidth = availableWidth;
                        finalHeight = availableWidth / imgAspect;
                    } else {
                        // Image is taller than available space
                        finalHeight = availableHeight;
                        finalWidth = availableHeight * imgAspect;
                    }
                    
                    // Center the image
                    const x = margin + (availableWidth - finalWidth) / 2;
                    const y = margin + (availableHeight - finalHeight) / 2;
                    
                    // Add image to PDF
                    const imgDataUrl = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                    
                    doc.addImage(imgDataUrl, 'JPEG', x, y, finalWidth, finalHeight);
                }
            }
            
            // Generate PDF blob
            const pdfBlob = doc.output('blob');
            
            // Update download link
            imageDownloadLink.href = URL.createObjectURL(pdfBlob);
            imageDownloadLink.download = 'images.pdf';
            imageDownload.style.display = 'block';
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error converting images to PDF: ' + error.message);
            console.error(error);
        }
    });
}

// HTML to PDF functionality
function initHTMLToPDF() {
    const htmlUpload = document.getElementById('html-upload');
    const htmlFileInput = document.getElementById('html-file');
    const htmlUrlInput = document.getElementById('html-url');
    const htmlBtn = document.getElementById('html-btn');
    const htmlDownload = document.getElementById('html-download');
    const htmlDownloadLink = document.getElementById('html-download-link');
    
    // Handle file selection
    htmlFileInput.addEventListener('change', function() {
        htmlBtn.disabled = !(htmlFileInput.files.length > 0 || htmlUrlInput.value.trim() !== '');
    });
    
    // Handle URL input
    htmlUrlInput.addEventListener('input', function() {
        htmlBtn.disabled = !(htmlFileInput.files.length > 0 || htmlUrlInput.value.trim() !== '');
    });
    
    // Convert HTML to PDF
    htmlBtn.addEventListener('click', async function() {
        const htmlFile = htmlFileInput.files[0];
        const htmlUrl = htmlUrlInput.value.trim();
        
        if (!htmlFile && !htmlUrl) return;
        
        showLoading('Converting HTML to PDF...');
        
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const pageSize = document.getElementById('html-page-size').value;
            const orientation = document.getElementById('html-orientation').value;
            const margin = parseInt(document.getElementById('html-margin').value);
            
            // Set PDF options
            let pdfOptions = {
                orientation: orientation,
                unit: 'mm'
            };
            
            // Set page size
            switch (pageSize) {
                case 'a4':
                    pdfOptions.format = 'a4';
                    break;
                case 'letter':
                    pdfOptions.format = [215.9, 279.4]; // Letter in mm
                    break;
                case 'a3':
                    pdfOptions.format = 'a3';
                    break;
                case 'a5':
                    pdfOptions.format = 'a5';
                    break;
                default:
                    pdfOptions.format = 'a4';
            }
            
            doc = new jsPDF(pdfOptions);
            
            let htmlContent = '';
            
            if (htmlFile) {
                // Read HTML file
                htmlContent = await htmlFile.text();
            } else if (htmlUrl) {
                // Fetch HTML from URL (note: this may have CORS limitations)
                try {
                    const response = await fetch(htmlUrl);
                    if (!response.ok) throw new Error('Failed to fetch URL');
                    htmlContent = await response.text();
                } catch (error) {
                    throw new Error('Failed to fetch URL: ' + error.message);
                }
            }
            
            // Create a temporary div to hold the HTML
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'absolute';
            tempDiv.style.left = '-9999px';
            tempDiv.style.width = (doc.internal.pageSize.getWidth() - (margin * 2)) + 'mm';
            tempDiv.innerHTML = htmlContent;
            document.body.appendChild(tempDiv);
            
            // Use html2canvas to render the HTML to canvas
            const canvas = await html2canvas(tempDiv, {
                scale: 2, // Higher quality
                width: tempDiv.offsetWidth,
                windowWidth: tempDiv.scrollWidth
            });
            
            // Remove the temporary div
            document.body.removeChild(tempDiv);
            
            // Add canvas image to PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const imgWidth = doc.internal.pageSize.getWidth() - (margin * 2);
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            doc.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
            
            // Generate PDF blob
            const pdfBlob = doc.output('blob');
            
            // Update download link
            htmlDownloadLink.href = URL.createObjectURL(pdfBlob);
            htmlDownloadLink.download = htmlFile ? htmlFile.name.replace(/\.[^/.]+$/, '') + '.pdf' : 'webpage.pdf';
            htmlDownload.style.display = 'block';
            
            hideLoading();
        } catch (error) {
            hideLoading();
            alert('Error converting HTML to PDF: ' + error.message);
            console.error(error);
        }
    });
}