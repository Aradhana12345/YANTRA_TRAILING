/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/record', 'N/search', 'N/runtime'],

    function(record, search, runtime) {
        function postSourcing(scriptContext) {
            //currentRecordObj will have the current rectype , recid , isdynamic and prototype
            var currentRecordObj = scriptContext.currentRecord;
            var subsidiary = currentRecordObj.getValue({
                fieldId: 'subsidiary'
            });

            var intra = 1;
            var inter = 2;
            var scriptObj = runtime.getCurrentScript();
            
            var getIndiaSubsidiary =[];
			var getSubsidiary = scriptObj.getParameter({
			  name: 'custscript_gst_to_cs_indiasubsidiary'
			});
			getIndiaSubsidiary.push(getSubsidiary);

            //If the subsidiary is India then execute further.
            if (getIndiaSubsidiary && (getIndiaSubsidiary.indexOf(subsidiary) != -1)) {
                if (scriptContext.fieldId == 'location') {

                    //get the value of the "From Location" and "To Location"
                    var fromLocation = currentRecordObj.getValue({
                        fieldId: 'location'
                    });
                    var toLocation = currentRecordObj.getValue({
                        fieldId: 'transferlocation'
                    });

                    //if from location is blank then gstType will be set to blank.
                    if (!fromLocation) {

                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_gsttype',
                            value: '',
                            ignoreFieldChange: true,
                            fireSlavingSync: true
                        });

                    } else {

                        if (fromLocation) {

                            // else load the location record which is selected in the fromLocation field
                            var locationRecordObj = record.load({
                                type: record.Type.LOCATION,
                                id: fromLocation
                            });

                            // Get the value of sub record attached to the Location record  
                            var subrec = locationRecordObj.getSubrecord({
                                fieldId: 'mainaddress'
                            });
                            // Go inside the main address field and get the GST registration number and state.
                            var locationGstNumber = subrec.getValue({
                                fieldId: 'custrecord_gst_nocustomeraddr'
                            });

                            locationState = subrec.getValue({
                                fieldId: 'state'
                            });

                            // Set the GST registration number in the parent record
                            currentRecordObj.setValue({
                                fieldId: 'custbody_gst_locationregno',
                                value: locationGstNumber
                            });

                            // Get the GST registration number and customer registration number for the parent record
                            var companyGstNumber = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_locationregno'
                            });
                            var customerGstNumber = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_customerregno'
                            });
                            if (companyGstNumber && customerGstNumber) {

                                //if both are not blank get the GST type
                                var getGstTypeId = getGstType(companyGstNumber, customerGstNumber);

                                //set the GST type to either inter or intra
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: getGstTypeId,
                                    ignoreFieldChange: true,
                                    fireSlavingSync: true
                                });
                            } else {
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: inter,
                                    ignoreFieldChange: true,
                                    fireSlavingSync: true
                                });
                            }
                        }
                    }
                }

                if (scriptContext.fieldId == 'transferlocation') {
                    //same logic id applied for the on change of to location field as well.
                    var toLocation = currentRecordObj.getValue({
                        fieldId: 'transferlocation'
                    });
                    var fromLocation = currentRecordObj.getValue({
                        fieldId: 'location'
                    });
                    if (!toLocation) {
                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_gsttype',
                            value: '',
                            ignoreFieldChange: true,
                            fireSlavingSync: true
                        });

                    } else {

                        var locationRecordObj = record.load({
                            type: record.Type.LOCATION,
                            id: toLocation
                        })

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
                            fieldId: 'custbody_gst_customerregno',
                            value: locationGstNumber
                        });

                        currentRecordObj.setValue({
                            fieldId: 'custbody_gst_destinationstate',
                            value: locationState
                        });

                        if (toLocation) {

                            var companyGstNumber = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_locationregno'
                            });
                            var customerGstNumber = currentRecordObj.getValue({
                                fieldId: 'custbody_gst_customerregno'
                            });

                            // Get the Company GST registration number and customer GST registration number for the parent record
                            if (companyGstNumber && customerGstNumber) {
                                var getGstTypeId = getGstType(companyGstNumber, customerGstNumber)
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: getGstTypeId,
                                    ignoreFieldChange: true,
                                    fireSlavingSync: true
                                });
                            } else {
                                currentRecordObj.setValue({
                                    fieldId: 'custbody_gst_gsttype',
                                    value: inter,
                                    ignoreFieldChange: true,
                                    fireSlavingSync: true
                                });
                            }
                        }
                    }
                }
                return;
            }
        }

        //If Subsidiary gets then sets the GST Registration number
        function setGstNumbers(subsidiary, currentRecordObj) {

            if (subsidiary) {
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

                currentRecordObj.setValue({
                    fieldId: 'custbody_gst_locationregno',
                    value: subsidiaryGstNumber,
                });
            }
        }

        // It compares last 2 digits of both fields and will set the GST type to either "Inter" or "Intra"
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
            postSourcing: postSourcing
        };

    });