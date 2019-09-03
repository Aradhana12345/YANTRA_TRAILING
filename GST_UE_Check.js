/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @Author 
 * @description: This Script basically calculates the cgst,sgst and igst of the particular items
 */
define(['N/record', 'N/search', 'N/runtime'],

    function(record, search, runtime) {

        var cgst = "cgst";
        var sgst = "sgst";
        var customformIds = [114, 225, 198, 105, 179];


        function beforeLoad(scriptContext) {



        }


        function beforeSubmit(scriptContext) {

            if (scriptContext.type == scriptContext.UserEventType.EDIT || scriptContext.type == scriptContext.UserEventType.CREATE) {

                var recordObj = scriptContext.newRecord;
                var formid = Number(recordObj.getValue({
                    fieldId: 'customform'
                }));
                if (customformIds.indexOf(formid) >= 0) {
                    var totalLineItem = recordObj.getLineCount({
                        sublistId: 'item'
                    });
                    submitInvoice(recordObj);


                    log.debug("DONE");
                }


            } // end of main if




        }

        function afterSubmit(scriptContext) {

        }

        function submitInvoice(invoiceObject) {
            var intra = 1;
            var inter = 2;
            var gstType = invoiceObject.getValue({
                fieldId: 'custbody_gst_gsttype'
            });
            var totalSgstAmount = 0;
            var totalCgstAmount = 0;
            var totalIgstAmount = 0;
            var totalLineItem = invoiceObject.getLineCount({
                sublistId: 'item'
            });
            if (gstType == intra) {

                log.debug('Total Line Count', totalLineItem);

                for (var i = 0; i < totalLineItem; i++) {
                    // get Tax code from the line item.
                    var taxCode = invoiceObject.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        line: i
                    });

                    log.audit('tax code', taxCode);

                    var taxGroupObject = record.load({
                        type: record.Type.TAX_GROUP,
                        id: taxCode
                    });

                    var totalLineItemTax = taxGroupObject.getLineCount({
                        sublistId: 'taxitem'
                    });

                    for (var j = 0; j < totalLineItemTax; j++) {

                        var taxname = taxGroupObject.getSublistValue({
                            sublistId: 'taxitem',
                            fieldId: 'taxtype',
                            line: j
                        });

                        taxname = taxname.split("_");
                        taxname = taxname.toLocaleString().toLowerCase().split(',');
                        if (taxname.indexOf(cgst) >= 0) {
                            var cgstRate = taxGroupObject.getSublistValue({
                                sublistId: 'taxitem',
                                fieldId: 'rate',
                                line: j
                            });
                            log.debug('cgstRate', cgstRate);
                        }

                        if (taxname.indexOf(sgst) >= 0) {
                            var sgstRate = taxGroupObject.getSublistValue({
                                sublistId: 'taxitem',
                                fieldId: 'rate',
                                line: j
                            });
                            log.debug('sgst rate', sgstRate);
                        }



                    }

                    var amount = invoiceObject.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        line: i
                    });
                    log.debug('AMOUNT', amount);
                    var cgstAmount = amount * (cgstRate / 100);
                    cgstAmount = cgstAmount.toFixed(2);

                    var sgstAmount = amount * (sgstRate / 100);
                    sgstAmount = sgstAmount.toFixed(2);
                    log.debug('', cgstAmount);
                    log.debug('', sgstAmount);

                    invoiceObject.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_gst_cgstamount',
                        line: i,
                        value: cgstAmount
                    });

                    invoiceObject.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_gst_cgstrate',
                        line: i,
                        value: cgstRate
                    });

                    invoiceObject.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_gst_sgstrate',
                        line: i,
                        value: sgstRate
                    });




                    invoiceObject.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_gst_sgstamount',
                        line: i,
                        value: sgstAmount
                    });

                    log.debug('Saved');

                    totalCgstAmount = Number(totalCgstAmount) + Number(cgstAmount);
                    totalSgstAmount = Number(totalSgstAmount) + Number(sgstAmount);


                }
            } else {

                log.debug('In else');
                var totalLineItem = invoiceObject.getLineCount({
                    sublistId: 'item'
                });
                log.debug('Total Line Count', totalLineItem);

                for (var i = 0; i < totalLineItem; i++) {

                    var taxCode = invoiceObject.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'taxcode',
                        line: i
                    });

                    log.audit('tax code', taxCode);
                    var taxGroupObject = record.load({
                        type: record.Type.TAX_GROUP,
                        id: taxCode
                    });

                    var totalLineItemTax = taxGroupObject.getLineCount({
                        sublistId: 'taxitem'
                    });

                    var taxname = taxGroupObject.getSublistValue({
                        sublistId: 'taxitem',
                        fieldId: 'taxtype',
                        line: 0
                    });
                    var taxtype = taxGroupObject.getSublistValue({
                        sublistId: 'taxitem',
                        fieldId: 'taxtype',
                        line: 0
                    });

                    taxtype = taxtype.split("_");
                    var code = taxtype[1];


                    var igst = 'IGST_' + code
                    igst = igst.toString();
                    log.debug('igst code', igst);


                    if (taxname == igst) {

                        var igstRate = taxGroupObject.getSublistValue({
                            sublistId: 'taxitem',
                            fieldId: 'rate',
                            line: 0
                        });
                        log.debug('igstRate', igstRate);

                    }

                    var amount = invoiceObject.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'amount',
                        line: i
                    });
                    log.debug('AMOUNT', amount);


                    var igstAmount = amount * (igstRate / 100);

                    log.debug('', igstAmount);

                    invoiceObject.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_gst_igstrate',
                        line: i,
                        value: igstRate
                    });

                    invoiceObject.setSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_gst_igstamount',
                        line: i,
                        value: igstAmount
                    });

                    totalIgstAmount = totalIgstAmount + igstAmount;

                    log.debug('Saved');
                }

            }
            if (totalCgstAmount && totalSgstAmount) {
                log.debug('Total Cgst amount', totalCgstAmount);
                log.debug('Total Sgst amount', totalSgstAmount);

                var taxTotal = invoiceObject.getValue({
                    fieldId: 'taxtotal'
                });

                log.debug('taxTotal', taxTotal);

                var cgstTotal = Number(0);
                var sgstTotal = Number(0);

                var toBeSplittedTaxTotal = taxTotal.toString();
                var splitTaxTotal = toBeSplittedTaxTotal.split(".");
                var getDecimal = splitTaxTotal[1];
                var modulus = Number(getDecimal) % 2;

                if (Number(modulus) != Number(0)) {

                    log.debug('Inside Odd number', 'Inside Odd number');

                    cgstTotal = taxTotal / 2;
                    log.debug('cgstTotal after division', cgstTotal);

                    cgstTotal = cgstTotal.toFixed(2);
                    log.debug('cgstTotal after toFixed', cgstTotal);

                    sgstTotal = taxTotal - cgstTotal;
                    log.debug('sgstTotal', sgstTotal);

                } else if (Number(modulus) == Number(0)) {

                    log.debug('Inside Even number', 'Inside Even number');

                    cgstTotal = taxTotal / 2;
                    log.debug('cgstTotal', cgstTotal);

                    sgstTotal = cgstTotal;
                    log.debug('sgstTotal', sgstTotal);
                }


                invoiceObject.setValue({
                    fieldId: 'custbody_gst_totalcgst',
                    value: cgstTotal
                });
                invoiceObject.setValue({
                    fieldId: 'custbody_gst_totalsgst',
                    value: sgstTotal
                });
            } else {

                log.debug('totalIgstAmount', totalIgstAmount);

                var igstTotal = invoiceObject.getValue({
                    fieldId: 'taxtotal'
                });
                log.debug('igstTotal', igstTotal);
                invoiceObject.setValue({
                    fieldId: 'custbody_gst_totaligst',
                    value: igstTotal
                });
            }

            // invoiceObject.save();
        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });