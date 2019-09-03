/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * This script is used to trigger Vendor Bill when Transfer order gets Fulfilled.
 */
define(['N/record', 'N/error', 'N/search', 'N/runtime'],

    function(record, error, search, runtime) {

        //Function to auto-generate Vendor Bill from the Item Receipts(current record) record created from Transfer Order.
        function afterSubmit(scriptContext) {
        	  mode = scriptContext.type;
          log.debug('scriptContext mode :-',mode);

            if (scriptContext.type == scriptContext.UserEventType.DELETE)
                return;

            if (scriptContext.type == scriptContext.UserEventType.CREATE) {

                //Determine the script parameters for subsidiary and generic service item.
                var scriptObj = runtime.getCurrentScript();
                
                var getIndiaSubsidiary =[];
    			var getSubsidiary = scriptObj.getParameter({
    			  name: 'custscript_gst_ir_ue_indiasubsidiary'
    			});
    			getIndiaSubsidiary.push(getSubsidiary);

                var serviceItem = runtime.getCurrentScript().getParameter("custscript_vb_serviceitem");

                //Declare variables to store total amount.
                var totalIgstAmount = 0;

                var recId = scriptContext.newRecord.id;
                var recType = scriptContext.newRecord.type;

                //Load IR and determine the created from field.
                var itemReceiptObj = record.load({
                    type: recType,
                    id: recId
                });

                var IRCreatedFrom = itemReceiptObj.getValue({
                    fieldId: 'createdfrom'
                });
                log.debug("IRCreatedFrom :-",IRCreatedFrom);

                //If created from on IR is not blank, execute further.
                if (IRCreatedFrom != null && IRCreatedFrom != '') {

                    //Search on transactions with created from field value.
                    var filterTransaction = [];

                    filterTransaction.push(search.createFilter({
                        name: 'internalid',
                        operator: search.Operator.ANYOF,
                        values: IRCreatedFrom
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
                            id: IRCreatedFrom
                        });

                        var subsidiary = transferOrderObj.getValue({
                            fieldId: 'subsidiary'
                        });
                        var isIGST = transferOrderObj.getValue({
                            fieldId: 'custbody_gst_isinter'
                        });
						log.debug("isIGST", isIGST);
						log.debug("subsidiary: ", subsidiary);
						log.debug("getIndiaSubsidiary:- ", getIndiaSubsidiary);

                        //If the subsidiary is India and the GST type as Inter then execute further.
                       if(getIndiaSubsidiary && (getIndiaSubsidiary.indexOf(subsidiary)!=-1)&& isIGST == true){
                            //Determine all the body fields required.
                            var fromLocation = transferOrderObj.getValue({
                                fieldId: 'location'
                            });

                            var toLocation = transferOrderObj.getValue({
                                fieldId: 'transferlocation'
                            });

                           log.debug('fromLocation: ', fromLocation);
						    log.debug('toLocation: ', toLocation);
							
							 var department = transferOrderObj.getValue({
								  fieldId: 'department'
								});
								
							var gstClass = transferOrderObj.getValue({
									fieldId: 'class'
								  });

                            var gstType = transferOrderObj.getValue({
                                fieldId: 'custbody_gst_gsttype'
                            });
							log.debug('gstType: ', gstType);

                            var destinationState = transferOrderObj.getValue({
                                fieldId: 'custbody_gst_destinationstate'
                            });
							log.debug('destinationState: ', destinationState);

                            var gstRegistrationNo = transferOrderObj.getValue({
                                fieldId: 'custbody_gst_locationregno'
                            });

                            var custGSTRegistrationNo = transferOrderObj.getValue({
                                fieldId: 'custbody_gst_customerregno'
                            });

                            //Variable declared to store the generic vendor value set on location record.
                            var interVendor = '';

                            var filterSetup = [];
                            filterSetup.push(search.createFilter({
                                name: 'custrecord_gst_setup_subsidiary',
                                operator: search.Operator.IS,
                                values: subsidiary
                            }));

                            var columnSetup = [];
                            columnSetup.push(search.createColumn({
                                name: 'custrecord_gst_setup_genericvendor'
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
                                interVendor = setupSearchResults[0].getValue('custrecord_gst_setup_genericvendor')
                                log.debug("Generic Vendor is", interVendor);
                            }

                            //Process the lines of Transfer Order to determine the required fields.
                            var totalLineItem = transferOrderObj.getLineCount({
                                sublistId: 'item'
                            });
                            log.debug('Total Line Item:- ', totalLineItem);

                            //If count is more than 0.
                            if (totalLineItem > 0) {

                                //Array declared to push the line item values for Vendor Bill generation.
                                var lineItemDetails = [];

                                for (var i = 0; i < totalLineItem; i++) {

                                    //Determine all the line fields required.
                                    var item = transferOrderObj.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        line: i
                                    });

                                    var quantity = transferOrderObj.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        line: i
                                    });

                                    var rate = transferOrderObj.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'amount',
                                        line: i
                                    });

                                    var hsnScaCode = transferOrderObj.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_hsnsaccode',
                                        line: i
                                    });

                                    var scheduleIdlookup = search.lookupFields({
                                        type: 'item',
                                        id: item,
                                        columns: 'custitem_gst_itemschedule'
                                    });

                                    if (scheduleIdlookup.custitem_gst_itemschedule[0]) {
                                        var gstSchedule = scheduleIdlookup.custitem_gst_itemschedule[0].value;
                                        log.debug("GST Schedule Id", gstSchedule);

                                    }

                                    //var gstSchedule = transferOrderObj.getSublistValue({
                                    //sublistId: 'item',
                                    //fieldId: 'custcol_gst_itemschedule',
                                    //line: i
                                    //});

                                    var igstRate = transferOrderObj.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_igstrate',
                                        line: i
                                    });
                                     log.debug("igstRate", igstRate);
                                    var igstAmount = transferOrderObj.getSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_igstamount',
                                        line: i
                                    });
                                     log.debug("igstAmount", igstAmount);
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
                                    var taxCodeInternalId;
                                    if (arrSearchResults) {
                                      taxCodeInternalId = arrSearchResults[0].getValue('custrecord_gst_tax_code');
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
									log.debug("lineItemDetails ;- ", lineItemDetails);

                                }

                                //Create Vendor Bill with all the details fetched from Transfer Order.
                                var vendorBillRecord = record.create({
                                    type: record.Type.VENDOR_BILL,
                                    isDynamic: true
                                });

                                vendorBillRecord.setValue({
                                    fieldId: 'entity',
                                    value: interVendor
                                });
								
                              //  if(fromLocation && department && gstClass ){
                             if(fromLocation || department || gstClass ){ 
								// log.debug('fromLocation if:-',fromLocation);
                               
                                vendorBillRecord.setValue({
                                    fieldId: 'location',   
                                    value: fromLocation   
                                });
								
								if(department){
								vendorBillRecord.setValue({
									fieldId: 'department',
									value: department
								  });
                                }
                               
                               if(gstClass){
								vendorBillRecord.setValue({
									fieldId: 'class',
									value: gstClass
								  });
                               }
							}

                                vendorBillRecord.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: gstType
                                });

                                vendorBillRecord.setValue({
                                    fieldId: 'custbody_gst_destinationstate',
                                    value: destinationState
                                });

                                vendorBillRecord.setValue({
                                    fieldId: 'custbody_gst_locationregno',
                                    value: gstRegistrationNo
                                });

                                vendorBillRecord.setValue({
                                    fieldId: 'custbody_gst_customerregno',
                                    value: custGSTRegistrationNo
                                });

                                vendorBillRecord.setValue({
                                    fieldId: 'custbody_gst_rltd_trnx',
                                    value: recId
                                });

                                //Lines added from the lines JSON maintained with Transfer Order values.
                                for (var j = 0; j < lineItemDetails.length; j++) {

                                    vendorBillRecord.selectNewLine({
                                        sublistId: 'item'
                                    });

                                    //Service Item is set instead of item selected in Transfer Order(Inventory Item) to avoid double impact on inventory.
                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'item',
                                        value: serviceItem
                                    });

                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'quantity',
                                        value: lineItemDetails[j].quantity
                                    });

                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'amount',
                                        value: lineItemDetails[j].rate
                                    });

                                    if (lineItemDetails[j].hsnScaCode != null && lineItemDetails[j].hsnScaCode != '') {

                                        vendorBillRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_gst_hsnsaccode',
                                            value: lineItemDetails[j].hsnScaCode
                                        });

                                    }
                                    if (lineItemDetails[j].gstSchedule != null && lineItemDetails[j].gstSchedule != '') {

                                        vendorBillRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'custcol_gst_itemschedule',
                                            value: lineItemDetails[j].gstSchedule
                                        });

                                    }

                                    if (lineItemDetails[j].taxCodeInternalId != null && lineItemDetails[j].taxCodeInternalId != '') {

                                        vendorBillRecord.setCurrentSublistValue({
                                            sublistId: 'item',
                                            fieldId: 'taxcode',
                                            value: lineItemDetails[j].taxCodeInternalId
                                        });

                                    }

                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_igstrate',
                                        value: lineItemDetails[j].igstrate,

                                    });

                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_igstamount',
                                        value: lineItemDetails[j].igstamount,
                                    });

                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_sgstrate',
                                        value: 0,
                                    });

                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_sgstamount',
                                        value: 0,
                                    });

                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_cgstrate',
                                        value: 0,
                                    });

                                    vendorBillRecord.setCurrentSublistValue({
                                        sublistId: 'item',
                                        fieldId: 'custcol_gst_cgstamount',
                                        value: 0,
                                    });

                                    vendorBillRecord.commitLine({
                                        sublistId: 'item'
                                    });

                                    //Calculate the total tax amount.
                                    totalIgstAmount = Number(totalIgstAmount) + Number(lineItemDetails[j].igstamount);

                                }

                                if (totalIgstAmount) {

                                    log.debug('Total totalIgstAmount amount', totalIgstAmount);
                                    vendorBillRecord.setValue({
                                        fieldId: 'custbody_gst_totaligst',
                                        value: totalIgstAmount
                                    });
                                    vendorBillRecord.setValue({
                                        fieldId: 'custbody_gst_totalcgst',
                                        value: 0
                                    });
                                    vendorBillRecord.setValue({
                                        fieldId: 'custbody_gst_totalsgst',
                                        value: 0
                                    });

                                }

                                var submitVendorBill = vendorBillRecord.save();
                                log.debug('submitVendorBill', submitVendorBill);

                                //If Vendor Bill submitted successfully, link it back on the Item Receipt record.
                                if (submitVendorBill != null && submitVendorBill != '') {

                                    record.submitFields({
                                        type: record.Type.ITEM_RECEIPT,
                                        id: recId,
                                        values: {
                                            'custbody_gst_rltd_trnx': submitVendorBill
                                        }
                                    });

                                }

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