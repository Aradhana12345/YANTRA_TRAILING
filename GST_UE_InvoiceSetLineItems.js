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

        function beforeLoad(scriptContext) {

            var currentRecordObj = scriptContext.newRecord;
            var subsidiary = currentRecordObj.getValue({
                fieldId: 'subsidiary'
            });
            var customerId = currentRecordObj.getValue({
                fieldId: 'entity'
            });
            var shippingAddress = currentRecordObj.getValue({
                fieldId: 'shipaddresslist'
            });

        }

        function beforeSubmit(scriptContext) {
            if (scriptContext.type == scriptContext.UserEventType.DELETE) {
                return true;
            }
            var currentRecordObj = scriptContext.newRecord;

            var scriptObj = runtime.getCurrentScript();
            var getIndiaSubsidiary = [];
            var getSubsidiary = scriptObj.getParameter({
                name: 'custscript_gst_sales_ue_indiasubsidiary'
            });

            getIndiaSubsidiary.push(getSubsidiary);
            log.debug("Script parameter of custscript1: " , getSubsidiary);

            //var GST_subsidiary = gstLIB.getSubsidiary();


            var subsidiary = currentRecordObj.getValue({
                fieldId: 'subsidiary'
            });
            log.debug("subsidiary : " , subsidiary);

            if (getIndiaSubsidiary && (getIndiaSubsidiary.indexOf(subsidiary) != -1)) {
                if (runtime.executionContext === runtime.ContextType.CSV_IMPORT) {

                    log.debug('CSV IMPORT');
                    var recordType = scriptContext.newRecord.type;
                    if (recordType == "salesorder") {
                        var soid = currentRecordObj.id;
                        log.debug('debug', 'Inside Sales Order ID:-', soid);
                        var currentRecordObj = record.load({
                            type: scriptContext.newRecord.type,
                            id: soid
                        });

                    }

                    var entityId = currentRecordObj.getValue({
                        fieldId: 'entity'
                    });

                    var shippingAddress = currentRecordObj.getValue({
                        fieldId: 'shipaddresslist'
                    });
                    log.audit('Enitity ID', entityId);
                    log.audit('Subsidiairy', subsidiary);
                    log.audit('shippingAddress', shippingAddress);
                    log.audit('Before Load Subsidiary', subsidiary);

                    // if (subsidiary == GST_subsidiary) {
                    if (GST_subsidiary.indexOf(subsidiary) != -1) {
                        log.debug('Enitity ID' + entityId + 'subsidiary' + subsidiary + 'shippingAddress' + shippingAddress + 'currentRecordObj' + currentRecordObj);
                        setCustomerGstNumber(entityId, subsidiary, shippingAddress, currentRecordObj);
                    }
                }

                var item_count = currentRecordObj.getLineCount({
                    sublistId: 'item'
                });
                log.debug('item count:-', item_count);

                var shipToState = currentRecordObj.getValue({
                    fieldId: 'custbody_gst_destinationstate'
                });
                log.debug('shipToState', shipToState);

                var gstType = currentRecordObj.getValue({
                    fieldId: 'custbody_gst_gsttype'
                });
                log.debug('gstType', gstType);


                //Load Search for discount Items...
                var discountItemSearch = search.load({
                    id: 'customsearch_tds_wht_items'
                });
                log.debug('discountItemSearch:- ', JSON.stringify(discountItemSearch));

                var arrDiscountItems = discountItemSearch.run().getRange({
                    start: 0,
                    end: 1000
                });

                // Array for list of discount Items...
                var discountItemIds = [];

                for (var t = 0; t < arrDiscountItems.length; t++) {
                    var discountId = arrDiscountItems[t].getValue({
                        name: 'internalid'
                    });
                    discountItemIds.push(discountId);

                }
                log.debug('discountItemIds list:- : ', JSON.stringify(discountItemIds));


                for (var k = 0; k < item_count; k++) {

                    var getItem = currentRecordObj.getSublistValue({
                        sublistId: 'item',
                        fieldId: 'item',
                        line: k
                    });
                    log.debug('getItem ', getItem);

                    if (discountItemIds.indexOf(getItem) == -1) {

                        var scheduleId = currentRecordObj.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_itemschedule',
                            line: k
                        });
                        log.debug('scheduleId ', scheduleId);

                       
				if((gstType!= '' && gstType!= null) && (scheduleId!='' && scheduleId!= null)){
		 //Search on GST Tax Code Matrix to get the tax code, reversal tax code, reversal purchase and payable items for cgst, sgst and igst.					 
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
                        log.debug('arrSearchResults', JSON.stringify(arrSearchResults));
                        var scriptObj = runtime.getCurrentScript();

                        if (arrSearchResults[0]) {
                            var taxCodeInternalId = arrSearchResults[0].getValue('custrecord_gst_tax_code');
                            //var reversalTaxCode = arrSearchResults[0].getValue('custrecord_gst_reversal_taxcode')

                        }
                        log.debug('taxCodeInternalId:-', taxCodeInternalId);
                        currentRecordObj.setSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            line: k,
                            value: taxCodeInternalId,
                            ignoreFieldChange: false
                        });   
					   } 
                    }

                  }
                }
            }

        function afterSubmit(scriptContext) {

            var cgstRate, sgstRate;

            var currentRecordObj = scriptContext.newRecord;
            var scriptObj = runtime.getCurrentScript();

            var getIndiaSubsidiary = [];
            var getSubsidiary = scriptObj.getParameter({
                name: 'custscript_gst_sales_ue_indiasubsidiary'
            });
            getIndiaSubsidiary.push(getSubsidiary);

            log.debug("Script parameter of custscript 2: ", getSubsidiary);

            var subsidiary = currentRecordObj.getValue({
                fieldId: 'subsidiary'
            });

            log.debug("subsidiary : ", subsidiary);

            if (getIndiaSubsidiary && (getIndiaSubsidiary.indexOf(subsidiary) != -1)) {

                if (runtime.executionContext === runtime.ContextType.CSV_IMPORT) {

                    var recordId = scriptContext.newRecord.id;
                    log.audit('CSV Import');
                    log.audit('Record ID', recordId);
                    return;

                }

                if (scriptContext.type == scriptContext.UserEventType.EDIT || scriptContext.type == scriptContext.UserEventType.CREATE) {

                    var invoiceId = scriptContext.newRecord.id;

                    var invoiceObject = record.load({
                        type: scriptContext.newRecord.type,
                        id: invoiceId
                    });
                    var totalLineItem = invoiceObject.getLineCount({
                        sublistId: 'item'
                    });
                    log.debug('invoiceId:- ', invoiceId);
                    submitInvoice(invoiceObject);


                    log.debug("DONE");

                } // end of main if
            }
        }

        function setCustomerGstNumber(customerId, subsidiary, shippingAddress, currentRecordObj) {
            if (customerId && subsidiary) {

                log.audit('-------------Start Setting Customer GSt Number--------------------');
                var rec = record.load({
                    type: record.Type.SUBSIDIARY,
                    id: subsidiary
                });
                var subrec = rec.getSubrecord({
                    fieldId: 'mainaddress'
                });
                var subsidiaryGstNumber = subrec.getValue({
                    fieldId: 'custrecord_gst_nocustomeraddr'
                });
                log.audit('Subsidiary Gst Number', subsidiaryGstNumber);
                currentRecordObj.setValue({
                    fieldId: 'custbody_gst_locationregno',
                    value: subsidiaryGstNumber,
                    ignoreFieldChange: true,
                    fireSlavingSync: true
                });


                var rec = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerId
                });
                var addressObject = getGstOnAddress(rec, shippingAddress);
                var state = addressObject.state;

                log.debug('State:- ', state)
                log.audit('Customer GST Number:- ', addressObject.gstNumber)
                if (addressObject.gstNumber) {
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_customerregno',
                        value: addressObject.gstNumber,
                        ignoreFieldChange: true,
                        fireSlavingSync: true
                    });
                }

                var stateFilter = [];
                var stateColumn = [];
                log.audit('State', state);
                if (state && state.length == 2) {
                    var stateFilter = [];
                    var stateColumn = [];
                    log.audit('State', state);

                    stateFilter.push(search.createFilter({
                        name: 'custrecord_gst_statesetup_stateabb',
                        operator: search.Operator.IS,
                        values: state
                    }));

                    stateColumn.push(search.createColumn({
                        name: 'custrecord_gst_state_setup_state'
                    }));

                    var stateSearch = search.create({
                        "type": "customrecord_gst_state_setup",
                        "filters": stateFilter,
                        "columns": stateColumn

                    }).run().getRange({
                        start: 0,
                        end: 1
                    });;


                    if (stateSearch[0]) {
                        var stateId = stateSearch[0].getValue('custrecord_gst_state_setup_state');
                    }

                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_destinationstate',
                        value: stateId

                    });

                } else {}

                // set the GST number of the company after gets the customer.
                var companyGstNumber = currentRecordObj.getValue({
                    fieldId: 'custbody_gst_locationregno'
                });
                var customerGstNumber = currentRecordObj.getValue({
                    fieldId: 'custbody_gst_customerregno'
                });
                if (companyGstNumber && customerGstNumber) {
                    var getGstTypeId = getGstType(companyGstNumber, customerGstNumber, state)
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_gsttype',
                        value: getGstTypeId,

                    });
                }

            }

            //---------------------Now we want to set the line items------------------------------------//
            var recordId = currentRecordObj.save();
            log.debug('ID saved', recordIds)

        }

        //set the GST Type as per GST Number, Destination State and State
        function getGstType(sourceGstNumber, destinationGst, state) {
            var intra = 1;
            var inter = 2;
            sourceGstNumber = sourceGstNumber.toString();
            sourceGstNumber = sourceGstNumber.substr(0, 2);
            if (!destinationGst) {
                var stateFilter = [];
                var stateColumn = [];

                stateFilter.push(search.createFilter({
                    name: 'custrecord_state',
                    operator: search.Operator.IS,
                    values: state
                }));

                taxCodeColumns.push(search.createColumn({
                    name: 'custrecord_state_code'
                }));

                var stateRecordSearch = search.create({
                    "type": "customrecord_state_code_mapping",
                    "filters": stateFilter,
                    "columns": stateColumn
                });

                stateRecordSearch = stateRecordSearch.run().getRange({
                    start: 0,
                    end: 1
                });
                if (stateRecordSearch[0]) {
                    var stateCode = arrSearchResults[0].getValue('custrecord_gst_tax_code')
                    destinationGst = stateCode;
                }
            } else {

                destinationGst = destinationGst.toString();
                destinationGst = destinationGst.substr(0, 2);

            }

            if (Number(sourceGstNumber) == Number(destinationGst)) {
                return intra;
            } else {
                return inter;
            }

        }

        //Gets the GST No and State 
        function getGstOnAddress(recObject, currentAddressId) {

            var lineCount = recObject.getLineCount({
                sublistId: 'addressbook'
            });
            for (var i = 0; i < lineCount; i++) {
                var addressId = recObject.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'id',
                    line: i
                });
                log.debug('addressId' + addressId);
                if (Number(currentAddressId) == Number(addressId)) {
                    var addressSubrecord = recObject.getSublistSubrecord({
                        sublistId: 'addressbook',
                        fieldId: 'addressbookaddress',
                        line: i
                    });

                    var customerGstID = addressSubrecord.getValue({
                        fieldId: 'custrecord_gst_nocustomeraddr'
                    });

                    var state = addressSubrecord.getValue({
                        fieldId: 'state'
                    });

                }
            }

            var addressObj = {
                'gstNumber': customerGstID,
                'state': state
            }

            return addressObj;
        }

        //sets the Line Item Values
        function setLineItems(currentRecordObj) {

            log.audit('Setting Tax Code');
            var gstType = currentRecordObj.getValue({
                fieldId: 'custbody_gst_gsttype'
            });
            var destinationState = currentRecordObj.getValue({
                fieldId: 'custbody_gst_destinationstate'
            });
            var itemCount = currentRecordObj.getLineCount({
                sublistId: 'item'
            });
            for (var i = 0; i < itemCount; i++) {

                var getSchedule = currentRecordObj.getLineCount({
                    sublistId: 'item',
                    fieldId: 'custcol_gst_itemschedule',
                    line: i
                });
                var getTaxCode = getTaxCodeBySearch(gstType, destinationState, getSchedule);
                currentRecordObj.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'taxcode',
                    line: i,
                    value: getTaxCode
                })

            }

            log.audit('Setting Tax Code DONE');


        }

        //Gets the Tax Code by using search
        function getTaxCodeBySearch(gstType, shipToState, scheduleIdline) {
            var taxCodeFilters = [];
            var taxCodeColumns = [];

            taxCodeFilters.push(search.createFilter({
                name: 'custrecord_gst_type',
                operator: search.Operator.IS,
                values: gstType
            }));

            taxCodeFilters.push(search.createFilter({
                name: 'custrecord_location_state',
                operator: search.Operator.IS,
                values: shipToState
            }));

            taxCodeFilters.push(search.createFilter({
                name: 'custrecord_gst_item_schedule',
                operator: search.Operator.IS,
                values: scheduleIdline
            }));

            taxCodeColumns.push(search.createColumn({
                name: 'custrecord_gst_tax_code'
            }));
            taxCodeColumns.push(search.createColumn({
                name: 'custrecord_sgst_revpur_item'
            }));
            taxCodeColumns.push(search.createColumn({
                name: 'custrecord_sgst_revpay_item'
            }));

            taxCodeColumns.push(search.createColumn({
                name: 'custrecord_cgst_revpur_item'
            }));

            taxCodeColumns.push(search.createColumn({
                name: 'custrecord_cgst_revpay_item'
            }));

            taxCodeColumns.push(search.createColumn({
                name: 'custrecord_gst_reversal_taxcode'
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
            if (arrSearchResults[0]) {
                var taxCodeitem = arrSearchResults[0].getValue('custrecord_gst_tax_code');

                log.debug('Custom Record Id', arrSearchResults[0].id);
                return taxCodeitem;


            } else {

                throw error.create({
                    name: 'Notice',
                    message: 'Custom tax code record for gst not found',
                    notifyOff: true
                });

            }

        }

        //Submit the Invoice with all data
        function submitInvoice(invoiceObject) {
            var intra = 1;
            var inter = 2;
            var gstType = invoiceObject.getValue({
                fieldId: 'custbody_gst_gsttype'
            });
            var subsi = invoiceObject.getValue({
                fieldId: 'subsidiary'
            });

            var scriptObj = runtime.getCurrentScript();
            var getIndiaSubsidiary = [];
            var getSubsidiary = scriptObj.getParameter({
                name: 'custscript_gst_sales_ue_indiasubsidiary'
            });
            getIndiaSubsidiary.push(getSubsidiary);

            log.debug("Script parameter of custscript 3:- ", getSubsidiary);

            if (getIndiaSubsidiary && (getIndiaSubsidiary.indexOf(subsi) != -1)) {
                var totalSgstAmount = 0;
                var totalCgstAmount = 0;
                var totalIgstAmount = 0;
                var totalLineItem = invoiceObject.getLineCount({
                    sublistId: 'item'
                });

                if (gstType == intra) {
                  
                  log.debug('intra','---------intra condition---------------');
                  
                    log.debug('Total Line Count:-', totalLineItem);
                    // get Tax code from the line item.
                    for (var i = 0; i < totalLineItem; i++) {

                        var discountItemType = invoiceObject.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemtype',
                            line: i
                        });
                        log.debug('Discount item type', discountItemType);
                        
                        var scheduleID = invoiceObject.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_itemschedule',
                            line: i
                        });
                        log.debug('Discount item scheduleID:- ', scheduleID);

                        if (discountItemType != 'Discount' && scheduleID!='') {

                            var taxCode = invoiceObject.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                line: i
                            });
                            log.debug('tax code:-', taxCode);

                            var taxGroupObject = record.load({
                                type: record.Type.TAX_GROUP,
                                id: taxCode
                            });
							
							 log.debug('taxGroupObject:-', taxGroupObject);

                            var totalLineItemTax = taxGroupObject.getLineCount({
                                sublistId: 'taxitem'
                            });
							 log.debug('totalLineItemTax:-', totalLineItemTax);

                            for (var j = 0; j < totalLineItemTax; j++) {

                                var taxname = taxGroupObject.getSublistValue({
                                    sublistId: 'taxitem',
                                    fieldId: 'taxtype',
                                    line: j
                                });
								 log.debug('taxname:-', taxname);

                                taxname = taxname.split("_");
                                taxname = taxname.toLocaleString().toLowerCase().split(',');
								
                                if (taxname.indexOf(cgst) >= 0) {
                                    var cgstRate = taxGroupObject.getSublistValue({
                                        sublistId: 'taxitem',
                                        fieldId: 'rate',
                                        line: j
                                    });
                                    log.debug('cgstRate:-', cgstRate);
                                }

                                if (taxname.indexOf(sgst) >= 0) {
                                    var sgstRate = taxGroupObject.getSublistValue({
                                        sublistId: 'taxitem',
                                        fieldId: 'rate',
                                        line: j
                                    });
                                    log.debug('sgst rate:-', sgstRate);
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
							
                            log.debug('cgst Amount:-', cgstAmount);
                            log.debug('sgst Amount:- ', sgstAmount);

                            invoiceObject.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_gst_cgstrate',
                                line: i,
                                value: cgstRate
                            });
                            invoiceObject.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_gst_cgstamount',
                                line: i,
                                value: cgstAmount
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

                            invoiceObject.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_gst_igstrate',
                                line: i,
                                value: 0
                            });

                            invoiceObject.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_gst_igstamount',
                                line: i,
                                value: 0
                            });
                            log.debug('Saved');

                            //Total CGST & SGST amount
                            totalCgstAmount = Number(totalCgstAmount) + Number(cgstAmount);
                            totalSgstAmount = Number(totalSgstAmount) + Number(sgstAmount);
                        }
                    }
                } else {
					
					    log.debug('inter','---------inter condition---------------');
					  
                    var totalLineItem = invoiceObject.getLineCount({
                        sublistId: 'item'
                    });
					log.debug('totalLineItem',totalLineItem);

                    for (var i = 0; i < totalLineItem; i++) {

                        var discountItemType = invoiceObject.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'itemtype',
                            line: i
                        });
                        log.debug('discount itemtype:-', discountItemType);
                        
                        var scheduleID = invoiceObject.getSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_itemschedule',
                            line: i
                        });
                        log.debug('Discount item scheduleID:- ', scheduleID);

                        if (discountItemType != 'Discount' && scheduleID!= '') {

                            var taxCode = invoiceObject.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                line: i
                            });
                            log.debug('tax code:-', taxCode);

                            var taxGroupObject = record.load({
                                type: record.Type.TAX_GROUP,
                                id: taxCode
                            });
                             log.debug('taxGroupObject:-', taxGroupObject);
                        
                            var totalLineItemTax = taxGroupObject.getLineCount({
                                sublistId: 'taxitem'
                            });
							  log.debug('totalLineItemTax :- ', totalLineItemTax);

                            var taxname = taxGroupObject.getSublistValue({
                                sublistId: 'taxitem',
                                fieldId: 'taxtype',
                                line: 0
                            });
                            log.debug('taxname:-', taxname);

                            var taxtype = taxGroupObject.getSublistValue({
                                sublistId: 'taxitem',
                                fieldId: 'taxtype',
                                line: 0
                            });
							 log.debug('taxtype :- ', taxtype);

                            taxtype = taxtype.split("_");
                            var code = taxtype[1];

                            var igst = 'IGST_' + code
                            igst = igst.toString();
                            log.debug('Igst code:-', igst);

                            {
                                var igstRate = taxGroupObject.getSublistValue({
                                    sublistId: 'taxitem',
                                    fieldId: 'rate',
                                    line: 0
                                });
                                log.debug('igstRate:-', igstRate);

                            }

                            var amount = invoiceObject.getSublistValue({
                                sublistId: 'item',
                                fieldId: 'amount',
                                line: i
                            });
                            log.debug('AMOUNT:-', amount);


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

                            invoiceObject.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_gst_sgstrate',
                                line: i,
                                value: 0
                            });

                            invoiceObject.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_gst_sgstamount',
                                line: i,
                                value: 0
                            });
                            invoiceObject.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_gst_cgstrate',
                                line: i,
                                value: 0
                            });

                            invoiceObject.setSublistValue({
                                sublistId: 'item',
                                fieldId: 'custcol_gst_cgstamount',
                                line: i,
                                value: 0
                            });

                            totalIgstAmount = totalIgstAmount + igstAmount;
                            log.debug('Saved');
                        }
                    }
                }
                if (totalCgstAmount && totalSgstAmount) {
					
                    log.debug('Total Cgst amount:-', totalCgstAmount);
                    log.debug('Total Sgst amount:-', totalSgstAmount);
                    invoiceObject.setValue({
                        fieldId: 'custbody_gst_totalcgst',
                        value: totalCgstAmount
                    });
                    invoiceObject.setValue({
                        fieldId: 'custbody_gst_totalsgst',
                        value: totalSgstAmount
                    });
                    invoiceObject.setValue({
                        fieldId: 'custbody_gst_totaligst',
                        value: 0
                    });
                } else {

                    invoiceObject.setValue({
                        fieldId: 'custbody_gst_totaligst',
                        value: totalIgstAmount
                    });
                    invoiceObject.setValue({
                        fieldId: 'custbody_gst_totalcgst',
                        value: 0
                    });
                    invoiceObject.setValue({
                        fieldId: 'custbody_gst_totalsgst',
                        value: 0
                    });
                }
                invoiceObject.save();
            }

        }

        return {
            beforeLoad: beforeLoad,
            beforeSubmit: beforeSubmit,
            afterSubmit: afterSubmit
        };

    });