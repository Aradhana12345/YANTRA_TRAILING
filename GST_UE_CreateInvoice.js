/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 
 */
define(['N/record', 'N/error', 'N/search', 'N/runtime'],

    function(record, error, search, runtime) {

        // Function to auto-generate Invoice from the Item Fulfillment(current record) record created from Transfer Order.
        function afterSubmit(scriptContext) {

            if (scriptContext.type == scriptContext.UserEventType.DELETE)
                return;

            //Determine the script parameters for subsidiary and generic service item.
            var scriptObj = runtime.getCurrentScript();
            
            var getIndiaSubsidiary =[];
			var getSubsidiary = scriptObj.getParameter({
			  name: 'custscript_gst_if_ue_indiasubsidiary'
			});
			getIndiaSubsidiary.push(getSubsidiary);
            log.debug("subsidiaryIndia:- ", getIndiaSubsidiary);

            var serviceItem = runtime.getCurrentScript().getParameter("custscript_iv_serviceitem");
            log.debug("serviceItem:-", serviceItem);

            // Declare variables to store total amount.
            var totalIgstAmount = 0;

            // Current record type and id.
            var recId = scriptContext.newRecord.id;
            var recType = scriptContext.newRecord.type;
            log.debug("recId - ", recId);

            // Load IF and determine the created from field.
            var itemFullfilmentObj = record.load({
                type: recType,
                id: recId
            });

            var IFCreatedFrom = itemFullfilmentObj.getValue({
                fieldId: 'createdfrom'
            });
            log.debug("IFCreatedFrom:- ", IFCreatedFrom);

            //If created from on IF is not blank, execute further.
            if (IFCreatedFrom != null && IFCreatedFrom != '') {

                //Search on transactions with created from field value.
                var filterTransaction = [];

                filterTransaction.push(search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: IFCreatedFrom
                }));

                var searchTransaction = search.create({
                    type: 'transaction',
                    columns: null,
                    filters: filterTransaction
                });

                //Variable declared to store the record/transaction type of the created from field transaction.
                var transactionType = '';

                searchTransaction.run().each(function(result) {

                    //Determine the record type attached in created from field.
                    transactionType = result.recordType;
                    return true;
                });

                //If the transaction type is Transfer Order, execute further.
                if (transactionType == 'transferorder') {
                    //Determine the details of Transfer Order
                    var transferOrderObj = record.load({
                        type: record.Type.TRANSFER_ORDER,
                        id: IFCreatedFrom
                    });

                    var subsidiary = transferOrderObj.getValue({
                        fieldId: 'subsidiary'
                    });
                    log.debug("subsidiary:- ", subsidiary);

                    var isIGST = transferOrderObj.getValue({
                        fieldId: 'custbody_gst_isinter'
                    });
                    log.debug("isIGST:-", isIGST);

                    //If the subsidiary is India and the GST type as Inter then execute further.
                    if (getIndiaSubsidiary && (getIndiaSubsidiary.indexOf(subsidiary) != -1) && isIGST == true) {
                        //Determine all the body fields required.
                        var fromLocation = transferOrderObj.getValue({
                            fieldId: 'location'
                        });
                        log.debug("fromLocation:-", fromLocation);

                        var toLocation = transferOrderObj.getValue({
                            fieldId: 'transferlocation'
                        });
                        log.debug("toLocation : ", toLocation);

                        var department = transferOrderObj.getValue({
                            fieldId: 'department'
                        });
                        log.debug("department : ", department);

                        var gstClass = transferOrderObj.getValue({
                            fieldId: 'class'
                        });
                        log.debug("gstClass : ", gstClass);

                        var gstType = transferOrderObj.getValue({
                            fieldId: 'custbody_gst_gsttype'
                        });
                        log.debug("gstType:- ", gstType);

                        var destinationState = transferOrderObj.getValue({
                            fieldId: 'custbody_gst_destinationstate'
                        });
                        log.debug("destinationState:- ", destinationState);

                        var gstRegistrationNo = transferOrderObj.getValue({
                            fieldId: 'custbody_gst_locationregno'
                        });
                        log.debug("gstRegistrationNo:- ", gstRegistrationNo);

                        var custGSTRegistrationNo = transferOrderObj.getValue({
                            fieldId: 'custbody_gst_customerregno'
                        });
                        log.debug("custGSTRegistrationNo:- ", custGSTRegistrationNo);

                        var interCustomer = '';

                        var filterSetup = [];
                        filterSetup.push(search.createFilter({
                            name: 'custrecord_gst_setup_subsidiary',
                            operator: search.Operator.IS,
                            values: subsidiary
                        }));

                        var columnSetup = [];
                        columnSetup.push(search.createColumn({
                            name: 'custrecord_gst_setup_genericcustomer'
                        }));

                        var setupSearch = search.create({
                            "type": "customrecord_gst_setup",
                            "filters": filterSetup,
                            "columns": columnSetup
                        });

                        var setupSearchResults = setupSearch.run().getRange({
                            start: 0,
                            end: 1
                        });

                        if (setupSearchResults[0]) {
                            interCustomer = setupSearchResults[0].getValue('custrecord_gst_setup_genericcustomer')
                            log.debug("interCustomer:-", interCustomer);
                        }

                        //Process the lines of Transfer Order to determine the required fields.
                        var totalLineItem = transferOrderObj.getLineCount({
                            sublistId: 'item'
                        });
                        log.debug('totalLineItem:- ', totalLineItem);

                        //If count is more than 0.
                        if (totalLineItem > 0) {

                            //Array declared to push the line item values for Invoice generation.
                            var lineItemDetails = [];

                            for (var i = 0; i < totalLineItem; i++) {

                                //Determine all the line fields required.
                                var item = transferOrderObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    line: i
                                });
                                log.debug("item:- ", item);

                                var quantity = transferOrderObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    line: i
                                });
                                log.debug("quantity:- ", quantity);

                                var rate = transferOrderObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    line: i
                                });
                                log.debug("rate:- ", rate);

                                var hsnScaCode = transferOrderObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_hsnsaccode',
                                    line: i
                                });
                                log.debug("hsnScaCode:- ", hsnScaCode);

                                var scheduleIdlookup = search.lookupFields({
                                    type: 'item',
                                    id: item,
                                    columns: 'custitem_gst_itemschedule'
                                });
                                log.debug("scheduleIdlookup:- ", scheduleIdlookup);

                                if (scheduleIdlookup.custitem_gst_itemschedule[0]) {
                                    var gstSchedule = scheduleIdlookup.custitem_gst_itemschedule[0].value;
                                    log.debug("GST Schedule:-", gstSchedule);

                                }
                                var igstRate = transferOrderObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_igstrate',
                                    line: i
                                });
                                log.debug("igstRate:- ", igstRate);

                                var igstAmount = transferOrderObj.getSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_igstamount',
                                    line: i
                                });
                                log.debug("igstAmount:- ", igstAmount);

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
                                    values: gstSchedule
                                }));

                                taxCodeColumns.push(search.createColumn({
                                    name: 'custrecord_gst_tax_code'
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
                                var scriptObj = runtime.getCurrentScript();
                                log.debug("scriptObj:- ", scriptObj);

                                var taxCodeInternalId;
                                if (arrSearchResults) {
                                    taxCodeInternalId = arrSearchResults[0].getValue('custrecord_gst_tax_code');
                                    log.debug("taxCodeInternalId:- ", taxCodeInternalId);
                                }

                                //Push all the determined values.
                                lineItemDetails.push({

                                    "item": item,
                                    "quantity": quantity,
                                    "rate": rate,
                                    "gstSchedule": gstSchedule,
                                    "hsnScaCode": hsnScaCode,
                                    "igstrate": igstRate,
                                    "igstamount": igstAmount,
                                    "taxCodeInternalId": taxCodeInternalId
                                });
                                log.debug("lineItemDetails:- ", JSON.stringify(lineItemDetails));
                            }

                            //Create Invoice with all the details fetched from Transfer Order.
                            var invoiceRecord = record.create({
                                type: record.Type.INVOICE,
                                isDynamic: true
                            });

                            log.debug("invoiceRecord :- ", JSON.stringify(invoiceRecord));
                            log.debug("invoiceRecord internal id :- ", recId);
                            log.debug("interCustomer[0].value", interCustomer);

                            /*  invoiceRecord.setValue({
                                fieldId: 'customform',
                                value: 347
                              });*/

                            invoiceRecord.setValue({
                                fieldId: 'entity',
                                value: interCustomer
                            });

                            log.debug("fromLocation", fromLocation);

                            invoiceRecord.setValue({
                                fieldId: 'subsidiary',
                                value: subsidiary
                            });

                            if (fromLocation && department && gstClass) {

                                invoiceRecord.setValue({
                                    fieldId: 'location',
                                    value: fromLocation
                                });

                                invoiceRecord.setValue({
                                    fieldId: 'department',
                                    value: department
                                });

                                invoiceRecord.setValue({
                                    fieldId: 'class',
                                    value: gstClass
                                });

                            }

                            invoiceRecord.setValue({
                                fieldId: 'custbody_gst_gsttype',
                                value: gstType
                            });

                            invoiceRecord.setValue({
                                fieldId: 'custbody_gst_destinationstate',
                                value: destinationState
                            });

                            invoiceRecord.setValue({
                                fieldId: 'custbody_gst_locationregno',
                                value: gstRegistrationNo
                            });

                            invoiceRecord.setValue({
                                fieldId: 'custbody_gst_customerregno',
                                value: custGSTRegistrationNo
                            });

                            invoiceRecord.setValue({
                                fieldId: 'custbody_gst_rltd_trnx',
                                value: recId
                            });

                            //Lines added from the lines JSON maintained with Transfer Order values
                            for (var j = 0; j < lineItemDetails.length; j++) {
                                invoiceRecord.selectNewLine({
                                    sublistId: 'item'
                                });

                                //Service Item is set instead of item selected in Transfer Order(Inventory Item) to avoid double impact on inventory.
                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'item',
                                    value: serviceItem,
                                    ignoreFieldChange: true
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'quantity',
                                    value: lineItemDetails[j].quantity
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'amount',
                                    value: lineItemDetails[j].rate
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'department',
                                    value: department
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'class',
                                    value: gstClass
                                });


                                if (lineItemDetails[j].hsnScaCode != null && lineItemDetails[j].hsnScaCode != '') {
                                    invoiceRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_hsnsaccode',
                                        value: lineItemDetails[j].hsnScaCode
                                    });

                                }

                                if (lineItemDetails[j].gstSchedule != null && lineItemDetails[j].gstSchedule != '') {

                                    invoiceRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_itemschedule',
                                        value: lineItemDetails[j].gstSchedule
                                    });

                                }

                                if (lineItemDetails[j].taxCodeInternalId != null && lineItemDetails[j].taxCodeInternalId != '') {
                                    invoiceRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'taxcode',
                                        value: lineItemDetails[j].taxCodeInternalId
                                    });

                                }

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_igstrate',
                                    value: lineItemDetails[j].igstrate,
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_igstamount',
                                    value: lineItemDetails[j].igstamount,
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_sgstrate',
                                    value: 0,
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_sgstamount',
                                    value: 0,
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_cgstrate',
                                    value: 0,
                                });

                                invoiceRecord.setCurrentSublistValue({
                                    sublistId: 'item',
                                    fieldId: 'custcol_gst_cgstamount',
                                    value: 0,
                                });

                                invoiceRecord.commitLine({
                                    sublistId: 'item'
                                });

                                //Calculate the total tax amount.
                                totalIgstAmount = Number(totalIgstAmount) + Number(lineItemDetails[j].igstamount);
                            }
                            log.debug("totalIgstAmount:-", totalIgstAmount);

                            if (totalIgstAmount) {

                                log.debug('Total totalIgstAmount amount', totalIgstAmount);
                                invoiceRecord.setValue({
                                    fieldId: 'custbody_gst_totaligst',
                                    value: totalIgstAmount
                                });
                                invoiceRecord.setValue({
                                    fieldId: 'custbody_gst_totalcgst',
                                    value: 0
                                });
                                invoiceRecord.setValue({
                                    fieldId: 'custbody_gst_totalsgst',
                                    value: 0
                                });

                            }

                            var submitInvoice = invoiceRecord.save();
                            log.debug("submitInvoice", submitInvoice);

                            //If Invoice submitted successfully, link it back on the Item FulFillment record.
                            if (submitInvoice != null && submitInvoice != '') {

                                record.submitFields({
                                    type: record.Type.ITEM_FULFILLMENT,
                                    id: recId,
                                    values: {
                                        'custbody_gst_rltd_trnx': submitInvoice
                                    }
                                });

                            }

                        }

                    }

                }

            }

        }

        return {
            afterSubmit: afterSubmit
        };

    });