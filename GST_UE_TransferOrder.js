/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * This script is used to trigger Vendor Bill when Transfer order gets Fulfilled.
 */
define(['N/record', 'N/error', 'N/search', 'N/runtime'],

    function(record, error, search, runtime) {

        var cgst = "cgst";
        var sgst = "sgst";
        var igst = "igst";
        var subsidiaryGstNumber;

        function beforeSubmit(scriptContext) {
            if (scriptContext.type != scriptContext.UserEventType.DELETE) {
                var totalSgstAmount = 0;
                var totalCgstAmount = 0;
                var totalIgstAmount = 0;

                var scriptObj = runtime.getCurrentScript();
                
                var getIndiaSubsidiary =[];
    			var getSubsidiary = scriptObj.getParameter({
    			  name: 'custscript_gst_to_ue_indiasubsidiary'
    			});
    			getIndiaSubsidiary.push(getSubsidiary);
                log.debug(" script parameter GST subsidiary:-", getSubsidiary);

                var recordObj = scriptContext.newRecord;
                var gstType = recordObj.getValue({
                    fieldId: 'custbody_gst_gsttype'
                });
                log.debug("gstType:- ", gstType);

                var shipToState = recordObj.getValue({
                    fieldId: 'custbody_gst_destinationstate'
                });
                var scheduleId = recordObj.getValue({
                    sublistId: 'item',
                    fieldId: 'custcol_gst_itemschedule'
                });
                var subsi = recordObj.getValue({
                    fieldId: 'subsidiary'
                });
                log.debug("record subsidiary:- ", subsi);

                //If the subsidiary is India then execute further.
                if (getIndiaSubsidiary && (getIndiaSubsidiary.indexOf(subsi) != -1)) {

                    var cgstRate = Number(0), sgstRate = Number(0), igstRate = Number(0);
                    var cgstAmount = Number(0), sgstAmount = Number(0), igstAmount = Number(0);

                    var totalLineItem = recordObj.getLineCount({
                        sublistId: 'item'
                    });

                    //Gets the line Item fields 
                    for (var i = 0; i < totalLineItem; i++) {

                        var getItem = recordObj.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                            line: i
                        });

                        var lookupScheduleId = search.lookupFields({
                            type: 'item',
                            id: getItem,
                            columns: 'custitem_gst_itemschedule'
                        });

                        var scheduleId = lookupScheduleId.custitem_gst_itemschedule[0].value;

                        log.debug('Schedule Id', scheduleId);


                        //search for getting the Tax Code
                        var taxCodeFilters = [];
                        var taxCodeColumns = [];

                        taxCodeFilters.push(search.createFilter({
                            name: 'custrecord_gst_type',
                            operator: search.Operator.IS,
                            values: gstType
                        }));

                        taxCodeFilters.push(search.createFilter({
                            name: 'custrecord_gst_item_schedule',
                            operator: search.Operator.IS,
                            values: scheduleId
                        }));

                        taxCodeColumns.push(search.createColumn({
                            name: 'custrecord_gst_tax_code'
                        }));

                        var taxCodeSearch = search.create({
                            "type": "customrecord_gst_tax_code_matrix",
                            "filters": taxCodeFilters,
                            "columns": taxCodeColumns
                        });

                        var arrSearchResults = taxCodeSearch.run().getRange({
                            start: 0,
                            end: 1
                        });

                        var taxCodeInternalId;
                        if (arrSearchResults[0]) {
                            taxCodeInternalId = arrSearchResults[0].getValue('custrecord_gst_tax_code');
                        }
						log.debug("taxCodeInternalId:- ",taxCodeInternalId);

                        var taxGroupObject = record.load({
                            type: record.Type.TAX_GROUP,
                            id: taxCodeInternalId
                        });

                        var totalLineItemTax = taxGroupObject.getLineCount({
                            sublistId: 'taxitem'
                        });

                        var isIGST = 'F';

                        //Gets the total line Item fields
                        for (var t = 0; t < totalLineItemTax; t++) {
                            var taxname = taxGroupObject.getSublistValue({
                                sublistId: 'taxitem',
                                fieldId: 'taxtype',
                                line: t
                            });

                            taxname = taxname.split("_");
                            taxname = taxname.toLocaleString().toLowerCase().split(',');

                            if (taxname.indexOf(cgst) >= 0) {
                                cgstRate = taxGroupObject.getSublistValue({
                                    sublistId: 'taxitem',
                                    fieldId: 'rate',
                                    line: t
                                });
                                log.debug('cgstRate', cgstRate);
                            }

                            if (taxname.indexOf(sgst) >= 0) {
                                sgstRate = taxGroupObject.getSublistValue({
                                    sublistId: 'taxitem',
                                    fieldId: 'rate',
                                    line: t
                                });
                                log.debug('sgst rate', sgstRate);
                            }

                            if (taxname.indexOf(igst) >= 0) {

                                isIGST = 'T';
                                igstRate = taxGroupObject.getSublistValue({
                                    sublistId: 'taxitem',
                                    fieldId: 'rate',
                                    line: t
                                });
                                log.debug('igst rate', igstRate);
                            }

                        }

                        var amount = recordObj.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'amount',
                            line: i
                        });
                        log.debug('AMOUNT', amount);

                        //calculate the total CGST,IGST,SGST Amount 
                        if (isIGST == 'T') {

                            igstAmount = amount * (igstRate / 100);
                            igstAmount = igstAmount.toFixed(2);

                            log.debug('IGST AMOUNT', igstAmount);

                            totalIgstAmount += Number(igstAmount);

                        } else if (isIGST == 'F') {                            
                            cgstAmount = amount * (cgstRate / 100);
                            cgstAmount = cgstAmount.toFixed(2);

                            sgstAmount = amount * (sgstRate / 100);
                            sgstAmount = sgstAmount.toFixed(2);

                            log.debug('CGST AMOUNT', cgstAmount)
                            log.debug('SGST AMOUNT', sgstAmount)

                            totalSgstAmount += Number(sgstAmount);
                            totalCgstAmount += Number(cgstAmount);

                        }

                        recordObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_igstrate',
                            line: i,
                            value: igstRate
                        });

                        recordObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_igstamount',
                            line: i,
                            value: igstAmount
                        });

                        recordObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_cgstrate',
                            line: i,
                            value: cgstRate
                        });

                        recordObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_cgstamount',
                            line: i,
                            value: cgstAmount
                        });

                        recordObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_sgstrate',
                            line: i,
                            value: sgstRate
                        });

                        recordObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_sgstamount',
                            line: i,
                            value: sgstAmount
                        });

                    }

                    if (isIGST == 'T')
                        recordObj.setValue({
                            fieldId: 'custbody_gst_isinter',
                            value: true
                        });
                    recordObj.setValue({
                        fieldId: 'custbody_gst_totaligst',
                        value: totalIgstAmount
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_gst_totalcgst',
                        value: totalCgstAmount
                    });
                    recordObj.setValue({
                        fieldId: 'custbody_gst_totalsgst',
                        value: totalSgstAmount
                    });

                }

            }
        }
        return {
            beforeSubmit: beforeSubmit
        };

    });