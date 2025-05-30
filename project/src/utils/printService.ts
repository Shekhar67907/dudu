import React from 'react';
import ReactDOM from 'react-dom';
import { PrescriptionData } from '../types';
import PrintablePrescription from '../components/Prescription/PrintablePrescription';
import PrintableCardPrescription from '../components/Prescription/PrintableCardPrescription';

/**
 * Print service for handling prescription printing
 */
export const printService = {
  /**
   * Prints a prescription in normal size format
   * @param data The prescription data to print
   * @param options Optional parameters including filename
   */
  printNormalSize: (data: PrescriptionData, options: { filename?: string } = {}) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Create a temporary container for the print content
        const printContainer = document.createElement('div');
        printContainer.className = 'print-only';
        document.body.appendChild(printContainer);

        // Create custom styles for print layout
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
          @media print {
            body * {
              visibility: hidden;
            }
            .print-only, .print-only * {
              visibility: visible;
            }
            .print-only {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            @page {
              size: A4;
              margin: 0.5cm;
              orphans: 0;
              widows: 0;
            }
            html, body {
              height: 99%;
              overflow: hidden;
            }
            /* Force single page */
            .print-container {
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              page-break-before: avoid !important;
              max-height: 27cm;
              overflow: hidden;
            }
            /* Hide other content */
            body > *:not(.print-only) {
              display: none !important;
            }
          }
        `;
        document.head.appendChild(styleElement);

        // Render the prescription component
        ReactDOM.render(
          React.createElement(PrintablePrescription, { data }),
          printContainer,
          () => {
            // Wait for rendering to complete then print
            setTimeout(() => {
              // Create a new window for printing
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                console.error('Failed to open print window. Please allow popups for this site.');
                document.body.removeChild(printContainer);
                alert('Please allow popups to print the prescription.');
                return;
              }
              
              // Set the filename for the PDF download
              const filename = options.filename || 'drishtirx.pdf';
              printWindow.document.write(`
                <html>
                  <head>
                    <title>${filename.replace(/\.pdf$/i, '')}</title>
                  </head>
                  <body>
                    ${printContainer.innerHTML}
                  </body>
                </html>
              `);
              printWindow.document.close();
              printWindow.focus();
              printWindow.print();
              printWindow.close();
              
              // Clean up after printing
              setTimeout(() => {
                document.body.removeChild(printContainer);
                document.head.removeChild(styleElement);
                ReactDOM.unmountComponentAtNode(printContainer);
                resolve();
              }, 500);
            }, 500);
          }
        );
      } catch (error) {
        console.error('Error printing prescription:', error);
        reject(error);
      }
    });
  },

  /**
   * Prints a prescription in card size format
   * @param data The prescription data to print
   * @param options Optional parameters including filename
   */
  printCardSize: (data: PrescriptionData, options: { filename?: string } = {}) => {
    // Create a temporary container for the print content
    const printContainer = document.createElement('div');
    printContainer.className = 'print-only';
    document.body.appendChild(printContainer);

    // Create custom styles for card size print layout
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-only, .print-only * {
          visibility: visible;
        }
        .print-only {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        @page {
          size: 3.5in 2in;
          margin: 0.05in;
        }
        html, body {
          height: 100%;
          overflow: hidden;
        }
        /* Force single page */
        .card-print-container {
          page-break-inside: avoid;
          page-break-after: avoid;
          page-break-before: avoid;
        }
        /* Hide other content */
        body > *:not(.print-only) {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(styleElement);

    // Render the card-sized printable component
    ReactDOM.render(
      React.createElement(PrintableCardPrescription, { data }),
      printContainer,
      () => {
        // Wait for rendering to complete then print
        setTimeout(() => {
          // Create a new window for printing
          const printWindow = window.open('', '_blank');
          if (!printWindow) {
            console.error('Failed to open print window. Please allow popups for this site.');
            document.body.removeChild(printContainer);
            alert('Please allow popups to print the prescription.');
            return;
          }
          
          // Set the filename for the PDF download
          const filename = options.filename || 'drishtirx.pdf';
          
          // Create a form to submit to the print window
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>${filename.replace(/\.pdf$/i, '')}</title>
                <style>
                  @page { size: auto; margin: 0; }
                  @media print {
                    body { margin: 0; padding: 0; }
                  }
                </style>
              </head>
              <body onload="window.print();">
                ${printContainer.innerHTML}
                <script>
                  // Set the PDF filename
                  document.title = '${filename.replace(/\.pdf$/i, '')}';
                  
                  // For Chrome's print preview
                  if (window.matchMedia) {
                    window.matchMedia('print').addListener(function(evt) {
                      if (evt.matches) {
                        // Before print
                        document.title = '${filename.replace(/\.pdf$/i, '')}';
                      } else {
                        // After print
                        window.close();
                      }
                    });
                  }
                  
                  // For other browsers
                  window.onafterprint = function() {
                    window.close();
                  };
                </script>
              </body>
            </html>
          `;
          
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          
          // Clean up after printing
          setTimeout(() => {
            document.body.removeChild(printContainer);
            document.head.removeChild(styleElement);
            ReactDOM.unmountComponentAtNode(printContainer);
          }, 500);
        }, 500);
      }
    );
  },

  /**
   * Prints a prescription in normal size with patient image
   * @param data The prescription data to print
   */
  printNormalSizeWithImage: (data: PrescriptionData) => {
    // Create a temporary container for the print content
    const printContainer = document.createElement('div');
    printContainer.className = 'print-only';
    document.body.appendChild(printContainer);

    // Create custom styles for print layout with image
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-only, .print-only * {
          visibility: visible;
        }
        .print-only {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        @page {
          size: A4;
          margin: 1cm;
        }
        .patient-image {
          display: block !important;
        }
      }
    `;
    document.head.appendChild(styleElement);

    // Render the printable component (with showImage=true)
    ReactDOM.render(
      React.createElement(PrintablePrescription, { data, showImage: true }),
      printContainer,
      () => {
        // Wait for rendering to complete then print
        setTimeout(() => {
          window.print();
          
          // Clean up after printing
          setTimeout(() => {
            document.body.removeChild(printContainer);
            document.head.removeChild(styleElement);
            ReactDOM.unmountComponentAtNode(printContainer);
          }, 500);
        }, 500);
      }
    );
  }
};
