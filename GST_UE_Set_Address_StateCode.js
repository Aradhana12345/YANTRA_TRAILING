/**
 *@NApiVersion 2.0
 *@NScriptType UserEventScript
 */
/*************************************************************
Script Name: GST_UE_SET_ADDRESS_STATECODE
Script Type: User Event Script
Created Date: 08/16/2018
Created By: Aradhana
Description:
*************************************************************/
define(['N/record', 'N/search', 'N/log', 'N/ui/serverWidget', 'N/runtime'],
    function(record, search, log, serverWidget, runtime) {
        // function beforeSubmit_setStateCode(context) 
        function afterSubmit_setStateCode(context) {
		if (context.type == context.UserEventType.CREATE ||context.type == context.UserEventType.EDIT || context.type == context.UserEventType.DELETE) {

            var recType = context.newRecord.type; // Customer Type
            log.debug('recType:-:', recType);

            var recId = context.newRecord.id;
            log.debug('recId:-:', recId);

            //Load the Customer record...
            var customerRec = record.load({
                id: recId,
                type: recType
            });

            //Get total number of Address from Sublist on Customer page... 
            for (var x = 0; x < customerRec.getLineCount({
                    sublistId: 'addressbook'
                }); x++) {
                log.debug('address line:-:', x);

                //Get data of Address from Subrecord from sublist... 
                var o_addressSubrecord = customerRec.getSublistSubrecord({
                    sublistId: "addressbook",
                    fieldId: "addressbookaddress",
                    line: x
                });
                var s_state = o_addressSubrecord.getValue({
                    fieldId: "state"
                });
                log.debug('s_state :', s_state);

                if (s_state != '' && s_state != null) {
                    var id_stateCode = getStateCode(s_state); //function call:To get the state code from custom record using filter
                    log.debug('address id_stateCode -:', id_stateCode);
                }
                if (id_stateCode != null && id_stateCode != '') {
                    log.debug('Set  id_stateCode -:', id_stateCode);
                    o_addressSubrecord.setValue({
                        fieldId: "custrecord_gst_addressstatecode",
                        value: id_stateCode
                    });
                }
            }
            //Submit the record...
            var saveRec = customerRec.save({
                enableSourcing: true,
                ignoreMandatoryFields: true
            });
            log.debug('saveRec', saveRec);
          }
		}

        function getStateCode(state) {
            log.debug('function call line:-:', 'func');
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
            if (searchResult != null && searchResult != '' && searchResult.length > 0) {
                stateCode = searchResult[0].getValue({
                    name: 'custrecord_gst_statesetup_statecode'
                });
            }
            return stateCode;
        }
        return {
            afterSubmit: afterSubmit_setStateCode
        };
    });