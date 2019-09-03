/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @Author 
 */
define(['N/ui/dialog', 'N/url', 'N/record', 'N/search', 'N/runtime', 'N/log', 'N/https'],

    function(dialog, url, record, search, runtime, log, https) {

        var pageLoad = 0;
        var subsidiaryGstNumber;
        var intra = 1;
        var inter = 2;
        var subsidiaryIndia = 5;

        function pageInit(scriptContext) {
            pageLoad = 1;
            var currentRecordObj = scriptContext.currentRecord;
            var subsidiary = Number(currentRecordObj.getValue({
                fieldId: 'subsidiary'
            }));
            if (subsidiary == subsidiaryIndia) {
                var vendorId = currentRecordObj.getValue({
                    fieldId: 'entity'
                });
                var location = currentRecordObj.getValue({
                    fieldId: 'location'
                });
                //setCustomerGstNumber wipes out the GST Registration Number. Only allow if it is a new transaction
                if (scriptContext.mode == 'create')
                    setGstNumbers(vendorId, subsidiary, currentRecordObj, location)

                if (subsidiary != null && subsidiary != '') {

                    var gststate = currentRecordObj.getValue({
                        fieldId: 'custbody_gst_state'
                    });
                    if (gststate == null || gststate == '') {
                        var EnableLocation = runtime.isFeatureInEffect({
                            feature: "LOCATIONS"
                        });

                        if (!EnableLocation) {
                            var subsidiary = currentRecordObj.getValue({
                                fieldId: 'subsidiary'
                            });
                            if (subsidiary) {
                                var locationRecordObj = record.load({
                                    type: record.Type.SUBSIDIARY,
                                    id: subsidiary
                                })

                                var subrec = locationRecordObj.getSubrecord({
                                    fieldId: 'mainaddress'
                                });

                                var SUBState = subrec.getValue({
                                    fieldId: 'custrecord_state_gst'
                                });
                                if (SUBState) {
                                    currentRecordObj.setValue({
                                        fieldId: 'custbody_gst_state',
                                        value: SUBState,
                                        ignoreFieldChange: true
                                    });
                                }
                            } else {
                                var suitelet = url.resolveScript({
                                    scriptId: 'customscript_softype_gst_st_processdata',
                                    deploymentId: 'customdeploy_softype_gst_st_processdata',
                                    returnExternalUrl: false
                                });
                                var response = https.get({
                                    url: suitelet
                                });

                                var Statedata = JSON.parse(response.body).statecode;
                                if (Statedata) {
                                    currentRecordObj.setValue({
                                        fieldId: 'custbody_gst_state',
                                        value: Statedata,
                                    });
                                } else {
                                    alert('No State in Company Information');
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
        }

        function fieldChanged(scriptContext) {

            var currentRecordObj = scriptContext.currentRecord;
            var subsidiary = Number(currentRecordObj.getValue({
                fieldId: 'subsidiary'
            }));
            if (subsidiary == subsidiaryIndia) {
                if (scriptContext.fieldId == 'entity') {

                    var vendorId = currentRecordObj.getValue({
                        fieldId: 'entity'
                    });
                    var shippingAddress = currentRecordObj.getValue({
                        fieldId: 'billaddresslist'
                    });

                    var location = currentRecordObj.getValue({
                        fieldId: 'location'
                    });

                    //setCustomerGstNumber wipes out the GST Registration Number. Only allow if location is not enabled or if it is not set
                    setGstNumbers(vendorId, subsidiary, currentRecordObj, location)

                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totalcgst',
                        value: '',

                    });
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totaligst',
                        value: '',

                    });
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totalsgst',
                        value: '',

                    });
                    console.log('field change set');

                }

                var getTaxCode;

                if (scriptContext.fieldId == "custbody_gst_gsttype") {

                }

                if (scriptContext.fieldId == "billaddresslist") {

                    var confirmVal = confirm('By Changing Vendor Address GST Type will be changed \n\n Do you want to Continue');

                    var vendorId = currentRecordObj.getValue({
                        fieldId: 'entity'
                    });
                    var currentAddressId = Number(currentRecordObj.getValue({
                        fieldId: 'billaddresslist'
                    }));

                    var rec = record.load({
                        type: record.Type.VENDOR,
                        id: vendorId
                    });

                    var addressObject = getGstOnAddress1(rec, currentAddressId);

                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_customerregno',
                        value: addressObject.gstNumber,

                    });
                    log.debug('addressObject.gstNumber', addressObject.gstNumber);

                    var state = addressObject.state;
                    log.debug('state', state);

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
                            log.debug('stateId', stateId);
                            //console.log(taxCodeInternalId);
                            currentRecordObj.setValue({
                                fieldId: 'custbody_gst_destinationstate',
                                value: stateId

                            });
                            var gststate = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_state'
                            });
                            if (stateId == gststate) {
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: intra,

                                });
                            } else if (stateId != gststate) {
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: inter,

                                });
                            }
                        }


                    } else {


                        currentRecordObj.setText({
                            fieldId: 'custbody_gst_destinationstate',
                            text: addressObject.state,

                        });
                        var deststate = addressObject.state;
                        var gststate = currentRecordObj.getText({
                            fieldId: 'custbody_gst_state'
                        });
                        if (deststate == gststate) {
                            currentRecordObj.setValue({
                                fieldId: 'custbody_gst_gsttype',
                                value: intra,

                            });
                        } else if (deststate != gststate) {
                            currentRecordObj.setValue({
                                fieldId: 'custbody_gst_gsttype',
                                value: inter,

                            });
                        }

                    }

                    var location = currentRecordObj.getValue({
                        fieldId: 'location'
                    });
                    if (location) {
                        var locationRecordObj = record.load({
                            type: record.Type.LOCATION,
                            id: location
                        })

                        var subrec = locationRecordObj.getSubrecord({
                            fieldId: 'mainaddress'
                        });
                        var companyState = subrec.getText({
                            fieldId: 'custrecord_state_gst'
                        });
                        var locationGstNumber = subrec.getValue({
                            fieldId: 'custrecord_gst_nocustomeraddr'
                        });
                        var locationState = subrec.getValue({
                            fieldId: 'state'
                        });
                        var customerGstNumber = currentRecordObj.getValue({
                            fieldId: 'custbody_gst_customerregno'
                        });
                        if (!customerGstNumber) {

                            var vendorid = currentRecordObj.getValue({
                                fieldId: 'entity'
                            });
                            var billAddress = currentRecordObj.getValue({
                                fieldId: 'billaddresslist'
                            });
                            var locationRecordObj = record.load({
                                type: record.Type.VENDOR,
                                id: vendorid
                            });

                            var addObject = getGstOnAddress1(locationRecordObj, billAddress);
                            var State = addObject.state;
                            //alert('State'+State);
                            if (locationState == State) {
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: intra,

                                });

                            } else {
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: inter,
                                });
                            }

                        } else {
                            var companyGstNumber = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_locationregno'
                            });
                            var customerGstNumber = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_customerregno'
                            });
                            if (companyGstNumber && customerGstNumber) {
                                var getGstTypeId = getGstType(companyGstNumber, customerGstNumber, addressObject.state);
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: getGstTypeId,

                                });
                            }
                        }
                    }

                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totalcgst',
                        value: '',

                    });
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totaligst',
                        value: '',

                    });
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totalsgst',
                        value: '',

                    });
                    console.log('field change set');
                }


                if (scriptContext.sublistId == 'item' && scriptContext.fieldId == 'custcol_gst_reversal_apply') {
                    var itemId = currentRecordObj.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'item'
                    });
                    getTaxCode = search.lookupFields({
                        type: 'item',
                        id: itemId,
                        columns: ''
                    });

                    //if(getTaxCode.[0])
                    if (getTaxCode.custitem_gst_itemschedule[0]) {
                        var scheduleId = getTaxCode.custitem_gst_itemschedule[0].value;
                    } else {

                        netsuiteAlert('Schedule is not set for this particular item');
                        return;
                    }



                    var shipToState = currentRecordObj.getValue({
                        fieldId: 'custbody_gst_destinationstate'
                    });
                    var gstType = currentRecordObj.getValue({
                        fieldId: 'custbody_gst_gsttype'
                    });

                    var taxCodeFilters = [];
                    var taxCodeColumns = [];

                    taxCodeFilters.push(search.createFilter({
                        name: 'custrecord_gst_type',
                        operator: search.Operator.IS,
                        values: gstType
                    }));

                    if (shipToState != null && shipToState != '') {
                        if (gstType == intra) {

                            taxCodeFilters.push(search.createFilter({
                                name: 'custrecord_location_state',
                                operator: search.Operator.IS,
                                values: shipToState
                            }));
                        }

                    }

                    taxCodeFilters.push(search.createFilter({
                        name: 'custrecord_gst_item_schedule',
                        operator: search.Operator.IS,
                        values: scheduleId
                    }));

                    taxCodeColumns.push(search.createColumn({
                        name: 'custrecord_gst_tax_code'
                    }));

                    taxCodeColumns.push(search.createColumn({
                        name: 'custrecord_gst_tax_code'
                    }));

                    taxCodeColumns.push(search.createColumn({
                        name: 'custrecord_gst_reversal_taxcode'
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
                    if (arrSearchResults[0]) {
                        var taxCodeInternalId = arrSearchResults[0].getValue('custrecord_gst_tax_code');
                        var reversalTaxCode = arrSearchResults[0].getValue('custrecord_gst_reversal_taxcode')
                    } else {

                        netsuiteAlert('Custom GST tax record for the selected destination state not found');
                        return;
                    }


                    var getApplyvalue = currentRecordObj.getCurrentSublistValue({
                        sublistId: 'item',
                        fieldId: 'custcol_gst_reversal_apply'
                    });
                    if (!getApplyvalue) {
                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: taxCodeInternalId,
                            ignoreFieldChange: false
                        });

                    } else {
                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'taxcode',
                            value: reversalTaxCode,
                            ignoreFieldChange: false
                        });

                    }
                }


                var locationState;
                if (scriptContext.fieldId == "location") {


                    var location = currentRecordObj.getValue({
                        fieldId: 'location'
                    });
                    if (location) {
                        var locationRecordObj = record.load({
                            type: record.Type.LOCATION,
                            id: location
                        })

                        var subrec = locationRecordObj.getSubrecord({
                            fieldId: 'mainaddress'
                        });
                        var companyState = subrec.getText({
                            fieldId: 'custrecord_state_gst'
                        });
                        var locationGstNumber = subrec.getValue({
                            fieldId: 'custrecord_gst_nocustomeraddr'
                        });
                        var locationState = subrec.getValue({
                            fieldId: 'state'
                        });
                        var statecode = subrec.getValue({
                            fieldId: 'custrecord_state_gst'
                        });
                        if (locationState == '' || locationState == null || !locationState || statecode == '' || statecode == null || !statecode) {
                            netsuiteAlert('location blank');
                            return false;
                        }
                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_locationregno',
                            value: locationGstNumber,

                        });

                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_state',
                            value: statecode,

                        });
                    }

                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totalcgst',
                        value: '',

                    });
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totaligst',
                        value: '',

                    });
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_totalsgst',
                        value: '',

                    });
                    console.log('field change set');



                }


                if (scriptContext.fieldId == 'custbody_gst_state') {
                    var compstate = currentRecordObj.getText({
                        fieldId: 'custbody_gst_state',

                    });
                    var vendorstate = currentRecordObj.getText({
                        fieldId: 'custbody_gst_destinationstate',

                    });
                    if (compstate == vendorstate) {

                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_gsttype',
                            value: intra

                        });


                    } else if (vendorstate == '' || vendorstate == null) {
                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_gsttype',
                            value: inter

                        });
                    } else if (compstate != vendorstate) {
                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_gsttype',
                            value: inter

                        });
                    }
                    return true;
                }
            }

        }

        function postSourcing(scriptContext) {

            var currentRecordObj = scriptContext.currentRecord;
            var scheduleId, getTaxCode;


            var subsidiary = currentRecordObj.getValue({
                fieldId: 'subsidiary'
            });
            if (subsidiary == 5) {

                if (scriptContext.sublistId == 'item') {
                    if (scriptContext.fieldId == 'item') {

                        var itemId = currentRecordObj.getCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'item',
                        });

                        var getTaxCode;
                        if (itemId) {

                            getTaxCode = search.lookupFields({
                                type: 'item',
                                id: itemId,
                                columns: ''
                            });

                            if (getTaxCode.custitem_gst_itemschedule[0]) {
                                var scheduleId = getTaxCode.custitem_gst_itemschedule[0].value;
                            } else {

                                netsuiteAlert('Schedule is not set for this particular item');
                                return;
                            }



                            var shipToState = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_destinationstate'
                            });
                            var gstType = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_gsttype'
                            });

                            var taxCodeFilters = [];
                            var taxCodeColumns = [];

                            taxCodeFilters.push(search.createFilter({
                                name: 'custrecord_gst_type',
                                operator: search.Operator.IS,
                                values: gstType
                            }));
                            if (shipToState != null && shipToState != '') {

                                if (gstType == intra) {

                                    taxCodeFilters.push(search.createFilter({
                                        name: 'custrecord_location_state',
                                        operator: search.Operator.IS,
                                        values: shipToState
                                    }));
                                }
                            }

                            taxCodeFilters.push(search.createFilter({
                                name: 'custrecord_gst_item_schedule',
                                operator: search.Operator.IS,
                                values: scheduleId
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
                            if (arrSearchResults[0]) {
                                var taxCodeInternalId = arrSearchResults[0].getValue('custrecord_gst_tax_code');
                                var reversalTaxCode = arrSearchResults[0].getValue('custrecord_gst_reversal_taxcode')
                            } else {

                                netsuiteAlert('Custom GST tax record for the selected destination state not found');
                                return;
                            }

                            currentRecordObj.setCurrentSublistValue({
                                sublistId: 'item',
                                fieldId: 'taxcode',
                                value: taxCodeInternalId,
                                ignoreFieldChange: false
                            });

                        }
                    }

                }

                if (scriptContext.sublistId == 'expense') {
                    if (scriptContext.fieldId == 'account') {
                        var accountId = currentRecordObj.getCurrentSublistValue({
                            sublistId: 'expense',
                            fieldId: 'account'
                        });

                        var getTaxCode;
                        if (accountId) {

                            var scheduleId = 1;
                            var shipToState = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_destinationstate'
                            });

                            var gstType = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_gsttype'
                            });

                            var taxCodeFilters = [];
                            var taxCodeColumns = [];

                            taxCodeFilters.push(search.createFilter({
                                name: 'custrecord_gst_type',
                                operator: search.Operator.IS,
                                values: gstType
                            }));
                            if (shipToState != null && shipToState != '') {

                                if (gstType == intra) {

                                    taxCodeFilters.push(search.createFilter({
                                        name: 'custrecord_location_state',
                                        operator: search.Operator.IS,
                                        values: shipToState
                                    }));
                                }
                            }

                            taxCodeFilters.push(search.createFilter({
                                name: 'custrecord_gst_item_schedule',
                                operator: search.Operator.IS,
                                values: scheduleId
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
                            if (arrSearchResults[0]) {
                                var taxCodeInternalId = arrSearchResults[0].getValue('custrecord_gst_tax_code')
                            } else {

                                netsuiteAlert('Custom GST tax record for the selected destination state not found');
                                return;
                            }
                            currentRecordObj.setCurrentSublistValue({
                                sublistId: 'expense',
                                fieldId: 'taxcode',
                                value: taxCodeInternalId,
                                ignoreFieldChange: false
                            });
                        }




                    }

                }
            }




        }


        function sublistChanged(scriptContext) {



        }


        function lineInit(scriptContext) {}


        function validateField(scriptContext) {

        }


        function validateLine(scriptContext) {
            var currentRecordObj = scriptContext.currentRecord;
            var subsidiary = currentRecordObj.getValue({
                fieldId: 'subsidiary'
            });
            if (subsidiary == 5) {

                var SelfBill = currentRecordObj.getValue({
                    fieldId: 'custbody_self_billing'
                });

                var purchaseType = currentRecordObj.getValue({
                    fieldId: 'custbody_purchase_type'
                });
                if (purchaseType == 2) {
                    if (SelfBill == true) {

                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_reversal_apply',
                            value: true
                        });
                        return true;


                    }
                }

                return true;

            }




        }

        function validateInsert(scriptContext) {

        }


        function validateDelete(scriptContext) {

        }


        function saveRecord(scriptContext) {


        }

        function netsuiteAlert(message) {
            var options = {
                title: "Alert",
                message: message
            };

            function success(result) {
                console.log("Success with value " + result);
            }

            function failure(reason) {
                console.log("Failure: " + reason);
            }

            dialog.alert(options).then(success).catch(failure);
        }

        /**
         *
         * @param recObject
         * @returns address detail Object
         */
        function getGstOnAddress(recObject) {
            var lineCount = recObject.getLineCount({
                sublistId: 'addressbook'
            });
            //alert('lineCount'+lineCount);


            for (var i = 0; i < lineCount; i++) {
                var addressId = recObject.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'id',
                    line: i
                });

                var defaultadd = recObject.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'defaultbilling',
                    line: i
                });

                //alert('defaultadd'+defaultadd);
                if (defaultadd == true) {
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
                    var country = addressSubrecord.getValue({
                        fieldId: 'country'
                    });
                    console.log('State-->' + state);
                }

            }




            var addressObj = {
                'gstNumber': customerGstID,
                'state': state,
                'country': country
            }

            return addressObj;
        }


        /**
         * 
         * @param customerId
         * @param subsidiary
         * @param shippingAddress
         * @param currentRecordObj
         *  sets customer and company gst number
         */
        function setGstNumbers(vendorId, subsidiary, currentRecordObj, location) {
            //alert('shippingAddress'+shippingAddress);
            if (vendorId && subsidiary) {
                var rec = record.load({
                    type: record.Type.SUBSIDIARY,
                    id: subsidiary
                });
                var subrec = rec.getSubrecord({
                    fieldId: 'mainaddress'
                });
                subsidiaryGstNumber = subrec.getValue({
                    fieldId: 'custrecord_gst_nocustomeraddr'
                });
                var companyState = subrec.getText({
                    fieldId: 'state'
                });
                if (!location || location == '') {
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_locationregno',
                        value: subsidiaryGstNumber,
                        ignoreFieldChange: true,
                        fireSlavingSync: true
                    });
                }

                var rec = record.load({
                    type: record.Type.VENDOR,
                    id: vendorId
                });
                var addressObject = getGstOnAddress(rec);
                var state = addressObject.state;
                var country = addressObject.country;
                //alert('country-->'+country);
                state = state.toString();
                //alert('state-->'+state);
                currentRecordObj.setValue({
                    fieldId: 'custbody_gst_customerregno',
                    value: addressObject.gstNumber,
                    ignoreFieldChange: true,
                    fireSlavingSync: true
                });
                //----------------get state from custom record---------------------------------------//
                if (state.length == 2) {
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
                        //alert(stateId);
                        //console.log(taxCodeInternalId);
                    }

                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_destinationstate',
                        value: stateId

                    });
                } else {
                    //=============== if state abbreviation is greater than 2
                    currentRecordObj.setText({
                        fieldId: 'custbody_gst_destinationstate',
                        text: state
                    });

                }

                //======================================================================================//
                // set the gst number of the company after get the customer.
                var companyGstNumber = currentRecordObj.getValue({
                    fieldId: 'custbody_gst_locationregno'
                });
                var customerGstNumber = currentRecordObj.getValue({
                    fieldId: 'custbody_gst_customerregno'
                });
                if (companyGstNumber && customerGstNumber) {
                    var getGstTypeId = getGstType(companyGstNumber, customerGstNumber)
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_gsttype',
                        value: getGstTypeId,
                        ignoreFieldChange: true,
                        fireSlavingSync: true
                    });
                }

                if (!customerGstNumber) {

                    var vendorstate = currentRecordObj.getText({
                        fieldId: 'custbody_gst_destinationstate'
                    });
                    //alert(companyState+" "+vendorstate);
                    if (companyState == vendorstate) {

                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_gsttype',
                            value: intra,

                        });


                    } else {

                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_gsttype',
                            value: inter,

                        });


                    }

                }


            }
        }

        function getGstOnAddress1(recObject, currentAddressId) {

            var lineCount = recObject.getLineCount({
                sublistId: 'addressbook'
            });

            log.debug('lineCount-->', lineCount);
            for (var i = 0; i < lineCount; i++) {
                var addressId = recObject.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'id',
                    line: i
                });

                log.debug('addressId713-->', addressId + '@@' + i);
                if (addressId == currentAddressId) {
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

                    log.debug('State-->', state);

                    var addressObj = {
                        'gstNumber': customerGstID,
                        'state': state
                    }

                    log.debug('test697', JSON.stringify(addressObj));
                    return addressObj;
                }

            }
        }

        /**
         *
         * @param sourceGstNumber
         * @param destinationGst
         * @returns
         */
        function getGstType(sourceGstNumber, destinationGst) {
            var intra = 1;
            var inter = 2;
            sourceGstNumber = sourceGstNumber.toString();
            sourceGstNumber = sourceGstNumber.substr(0, 2);

            destinationGst = destinationGst.toString();
            destinationGst = destinationGst.substr(0, 2);

            if (Number(sourceGstNumber) == Number(destinationGst)) {
                return intra;
            } else {

                return inter;
            }


        }


        return {
            pageInit: pageInit,
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
            sublistChanged: sublistChanged,
            validateLine: validateLine

        };

    });