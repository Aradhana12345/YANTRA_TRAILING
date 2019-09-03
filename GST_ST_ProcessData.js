/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/config'],

    function(ui, runtime, config) {

        function onRequest(context) {

            var action = context.request.method;
            if (action == 'GET') {

                var companyInfo = config.load({
                    type: config.Type.COMPANY_INFORMATION
                });
                log.debug('companyInfo', companyInfo);
                var compsubrec = companyInfo.getSubrecord({
                    fieldId: 'mainaddress'
                });
                var compState = compsubrec.getValue({
                    fieldId: 'state'
                });
                var statecode = compsubrec.getValue({
                    fieldId: 'custrecord_state_gst'
                });

                var searchData = {
                    statecode: statecode
                };
                searchData = JSON.stringify(searchData);
                log.debug('searchData', searchData);
                response.write(searchData);

            }

            return true;
        }

        return {
            onRequest: onRequest
        };

    });