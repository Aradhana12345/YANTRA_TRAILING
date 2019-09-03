/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 * @Author 
 */
/*************************************************************
Script Name: GST_UE_SET_ADDRESS_STATECODE
Script Type: Client Event Script
Created Date: 08/16/2018
Created By: Aradhana
Description:
*************************************************************/
define(['N/record', 'N/search', 'N/runtime', 'N/log'],

    function(record, search, runtime, log) {

        function fieldChanged(context) {
            var currentRecord = context.currentRecord;
            var recordType = currentRecord.type;
            var state = currentRecord.getValue("state");
            if (state != '' && state != null && state != undefined && state != 'undefined') {
                stateCodeId = getStateCode(state); //function call:To get the state code from custom record using filter

                currentRecord.setValue({
                    fieldId: 'custrecord_gst_addressstatecode',
                    value: stateCodeId,
                    ignoreFieldChange: true,
                    fireSlavingSync: true
                });
				
				 currentRecord.getField({
             	   fieldId: 'custrecord_gst_addressstatecode'
             	  }).isDisabled = true;
            }
        }

        function saveRecord(context) {
            var stateCodeId;
            var currentRecord = context.currentRecord;
            var recordType = currentRecord.type;
            // alert(recordType);
            var state = currentRecord.getValue("state");
            //alert("state:- " +state);
            var gstNumber = currentRecord.getValue("custrecord_gst_nocustomeraddr");
            //alert("GST NUMBER:- " +gstNumber.length);
			var gstNoCount = gstNumber.length;
			//alert("gstNoCount:- " +gstNoCount);

			if(gstNumber){
				if(gstNoCount < 15)
				{
					alert("Hello");
					return false;
				}
				else{
					return true;
				}
			}

            if (recordType == "address") {
                if (state != '' && state != null && state != undefined && state != 'undefined') {
                    stateCodeId = getStateCode(state);
                    var gstNo = currentRecord.getValue("custrecord_gst_nocustomeraddr");
                    //alert('gstNo:- ' + gstNo);
                    if (gstNo == null || gstNo == '') {
                        // alert("save f");
                        return true;
                    } else {
                       // alert("save else");
                        var locationGstNumber = gstNo.toString();
                        var locationGstNumber = locationGstNumber.substr(0, 2);
                      //alert('string locationGstNumber:- ' + locationGstNumber);


                        var strStateCode = stateCodeId;
                       // alert('strStateCode:- ' + strStateCode);//7

                        if (strStateCode < 10) {
                            //return ("0" + strStateCode);
							var stCode = ("0" + strStateCode);
                        }
						else{
							var stCode = strStateCode;
						}
					  //alert("disable code - "+stCode);

                        if (locationGstNumber!= stCode) {
                            alert("The state code mentioned in GSTIN number does not match with the state code of the selected state. Please check and correct.")
                            return false;
                        } else {
                            return true;
                        }
                    }
                    return true;
                } else {
                    alert("Please select state");
                    return false;
                }
            } else {
                return true;
            }
			

        }


        function getStateCode(state) {
            //  alert("State call from record");
            var stateCode = '';
            var createSearch = search.create({
                type: 'customrecord_gst_state_setup',
                columns: [{
                        name: 'internalid'
                    },
                    {
                        name: 'custrecord_gst_statesetup_statecode'
                    }
                ],

                filters: [{
                    name: 'custrecord_gst_statesetup_stateabb',
                    operator: 'is',
                    values: state
                }]
            });

            var searchResult = createSearch.run().getRange({
                start: 0,
                end: 50
            });
            //alert("searchResult"+searchResult);
            if (searchResult.length != null && searchResult.length != '' && searchResult.length > 0) {
                stateCode = searchResult[0].getValue({
                    name: 'custrecord_gst_statesetup_statecode'
                });
            }
            // alert('stateCode:- ' + stateCode);
            return stateCode;
        }

        return {
            fieldChanged: fieldChanged,
            saveRecord: saveRecord
        }
    });