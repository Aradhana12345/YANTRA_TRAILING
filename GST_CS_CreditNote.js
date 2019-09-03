/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/record', 'N/search', 'N/runtime', './GST_CS_LIB.js'],

    function(currentRecord, record, search, runtime, gstLIB) {


        var subsidiaryGstNumber; // company gst number

        //Hardcoded value; we can get from company preference or from GST set up
        var intra = 1;
        var inter = 2;

        function pageInit(scriptContext) {

            var GST_subsidiary = gstLIB.getSubsidiary();
            log.debug("Script parameter of custscript1: " + GST_subsidiary.id);

            var currentRecordObj = scriptContext.currentRecord;

            //Restrict for particular form
            var formid = currentRecordObj.getValue({
                fieldId: 'customform'
            });

            //Hard coded value for form;
            //if(formid == 198 || formid == 105 || formid == 179)//salesorder =229, cash sale =234
            {
                if (scriptContext.mode == 'copy') {
                    var lineItemCount = currentRecordObj.getLineCount({
                        sublistId: 'item'
                    });
                    for (var i = 0; i < lineItemCount; i++) {
                        currentRecordObj.selectLine({
                            sublistId: 'item',
                            line: i
                        });
                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_sgstrate',
                            value: ''
                        });

                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_cgstrate',
                            value: ''
                        });

                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_igstrate',
                            value: ''
                        });

                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_igstamount',
                            value: ''
                        });

                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_sgstamount',
                            value: ''
                        });

                        currentRecordObj.setCurrentSublistValue({
                            sublistId: 'item',
                            fieldId: 'custcol_gst_cgstamount',
                            value: ''
                        });

                        currentRecordObj.commitLine({
                            sublistId: 'item'
                        });
                    }

                    return;

                }
                // get subsidiary; added globally
                //var subsidiary = 1;//currentRecordObj.getValue({fieldId: 'subsidiary'});
                var customerId = currentRecordObj.getValue({
                    fieldId: 'entity'
                });

                var shippingAddress = currentRecordObj.getValue({
                    fieldId: 'shipaddresslist'
                });


                //--------- if customer and subsidiary is set --------------------//
                //setCustomerGstNumber(customerId,subsidiary,shippingAddress,currentRecordObj);
            }

        }

        function fieldChanged(scriptContext) {

            var currentRecordObj = scriptContext.currentRecord;
            //Restrict for particular form
            //var formid =  currentRecordObj.getValue({fieldId: 'customform'});
            //Hard coded value for form;
            //if(formid == 198 || formid == 105 || formid == 179)//salesorder =229, cash sale=234
            {
                if (scriptContext.fieldId == "entity") {
                    //Subsidiary has hardcode value; purpose : don't know
                    // get subsidiary; added globally
                    //var subsidiary = 1;//currentRecordObj.getValue({fieldId:'subsidiary'});
                    console.log('Subsidiary-->' + subsidiary);
                    var customerId = currentRecordObj.getValue({
                        fieldId: 'entity'
                    });
                    var shippingAddress = currentRecordObj.getValue({
                        fieldId: 'shipaddresslist'
                    });
                    setCustomerGstNumber(customerId, subsidiary, shippingAddress, currentRecordObj);
                    console.log('field change set');

                }

                var locationState;
                if (scriptContext.fieldId == "location" && (scriptContext.sublistId == null || scriptContext.sublistId == 'null')) {

                    var location = currentRecordObj.getValue({
                        fieldId: 'location'
                    });

                    if (!location) {
                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_locationregno',
                            value: subsidiaryGstNumber
                        });

                    } else {

                        var locationRecordObj = record.load({
                            type: record.Type.LOCATION,
                            id: location
                        });

                        var subrec = locationRecordObj.getSubrecord({
                            fieldId: 'mainaddress'
                        });

                        var locationGstNumber = subrec.getValue({
                            fieldId: 'custrecord_gst_nocustomeraddr'
                        });
                        locationState = subrec.getValue({
                            fieldId: 'state'
                        });

                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_locationregno',
                            value: locationGstNumber,

                        });

                        var companyGstNumber = currentRecordObj.getValue({
                            fieldId: 'custbody_gst_locationregno'
                        });
                        var customerGstNumber = currentRecordObj.getValue({
                            fieldId: 'custbody_gst_customerregno'
                        });
                        if (companyGstNumber && customerGstNumber) {
                            var getGstTypeId = getGstType(companyGstNumber, customerGstNumber, locationState)
                            currentRecordObj.setValue({
                                fieldId: 'custbody_gst_gsttype',
                                value: getGstTypeId,

                            });
                        } else {
                            //set intra incase of Customer GST number not found

                            var companyState = currentRecordObj.getText({
                                fieldId: 'custbody_gst_destinationstate'
                            });
                            if (locationState.length == 2) {

                                stateText = getStateText(locationState);

                            } else {

                                stateText = locationState;

                            }
                            if (companyState == stateText) {


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

                return true;
            }
        }

        function postSourcing(scriptContext) {

            var currentRecordObj = currentRecord.get();
            //Restrict for particular form
            var formid = currentRecordObj.getValue({
                fieldId: 'customform'
            });
            var myStateCode = currentRecordObj.getValue({
                fieldId: 'custbody_gst_locationregno'
            });
            if (myStateCode != null && myStateCode != '') {
                myStateCode = myStateCode.substr(0, 2);
            }
            console.log('myStateCode = ' + myStateCode);
            //if(formid == 198 || formid == 105 || formid == 179)//salesorder =229,cash sale=234
            {
                if (scriptContext.fieldId == "shipaddresslist") {
                    var customerId = currentRecordObj.getValue({
                        fieldId: 'entity'
                    });
                    var currentAddressId = Number(currentRecordObj.getValue({
                        fieldId: 'shipaddresslist'
                    }));

                    var rec = record.load({
                        type: record.Type.CUSTOMER,
                        id: customerId
                    });

                    var addressObject = getGstOnAddress(rec, currentAddressId);

                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_customerregno',
                        value: addressObject.gstNumber,

                    });

                    var state = addressObject.state;
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
                    } else {

                        currentRecordObj.setText({
                            fieldId: 'custbody_gst_destinationstate',
                            text: addressObject.state,

                        });

                    }

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
                    } else if (companyGstNumber) {
                        //set intra incase of Customer GST number not found
                        if (customerGstNumber == '' || customerGstNumber == null) {
                            currentRecordObj.setValue({
                                fieldId: 'custbody_gst_gsttype',
                                value: 1,
                                ignoreFieldChange: true,
                                fireSlavingSync: true
                            });
                        }
                    }

                }

                return true;
            }
        }

        function getGstOnAddress(recObject, currentAddressId) {

            var lineCount = recObject.getLineCount({
                sublistId: 'addressbook'
            });
            console.log(currentAddressId);
            if (currentAddressId != null && currentAddressId != '' && currentAddressId != undefined) {
                for (var i = 0; i < lineCount; i++) {
                    var addressId = recObject.getSublistValue({
                        sublistId: 'addressbook',
                        fieldId: 'id',
                        line: i
                    });
                    console.log('addressId' + addressId);
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
            } else {
                var addressId = recObject.getSublistValue({
                    sublistId: 'addressbook',
                    fieldId: 'id',
                    line: 0
                });
                console.log('addressId' + addressId);

                var addressSubrecord = recObject.getSublistSubrecord({
                    sublistId: 'addressbook',
                    fieldId: 'addressbookaddress',
                    line: 0
                });

                var customerGstID = addressSubrecord.getValue({
                    fieldId: 'custrecord_gst_nocustomeraddr'
                });

                var state = addressSubrecord.getValue({
                    fieldId: 'state'
                });
            }

            var addressObj = {
                'gstNumber': customerGstID,
                'state': state
            }

            return addressObj;
        }

        /**
         *
         * @param sourceGstNumber
         * @param destinationGst
         * @returns
         */
        function getGstType(sourceGstNumber, destinationGst, state) {
            //alert(state);
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
                    var stateCode = arrSearchResults[0].getValue('custrecord_gst_tax_code');
                    destinationGst = stateCode;
                    //console.log(taxCodeInternalId);
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

        function setCustomerGstNumber(customerId, subsidiary, shippingAddress, currentRecordObj) {
            if (customerId && subsidiary) {

                var rec = record.load({
                    type: record.Type.CUSTOMER,
                    id: customerId
                });
                var addressObject = getGstOnAddress(rec, shippingAddress);
                var state = addressObject.state;
                state = state.toString();

                if (addressObject.gstNumber) {
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_customerregno',
                        value: addressObject.gstNumber,
                        ignoreFieldChange: true,
                        fireSlavingSync: true
                    });
                }

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

                } else {

                    currentRecordObj.setText({
                        fieldId: 'custbody_gst_destinationstate',
                        text: state,
                        ignoreFieldChange: true,
                        fireSlavingSync: true
                    });
                }

                // set the gst number of the company after get the customer.
                var companyGstNumber = currentRecordObj.getValue({
                    fieldId: 'custbody_gst_locationregno'
                });
                var customerGstNumber = currentRecordObj.getValue({
                    fieldId: 'custbody_gst_customerregno'
                });
                if (companyGstNumber && customerGstNumber) {
                    var getGstTypeId = getGstType(companyGstNumber, customerGstNumber, state);
                    currentRecordObj.setValue({
                        fieldId: 'custbody_gst_gsttype',
                        value: getGstTypeId,
                        ignoreFieldChange: true,
                        fireSlavingSync: true
                    });
                } else if (companyGstNumber) {
                    //set intra incase of Customer GST number not found
                    if (customerGstNumber == '' || customerGstNumber == null) {
                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_gsttype',
                            value: 1,
                            ignoreFieldChange: true,
                            fireSlavingSync: true
                        });
                    }
                }
            }
        }

        function getStateText(state) {

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
                var stateText = stateSearch[0].getText('custrecord_gst_state_setup_state');
                return stateText;

            } else {

                return "No State Found";
            }

        }

        return {
            fieldChanged: fieldChanged,
            postSourcing: postSourcing,
        };

    });