/**
 * DataSync mixin is used to sync data properties in different component instances.
 *
 */
var DataSyncMixin = {
    created: function(){

        var dataArray = [];
        if( typeof this.getDataSyncConfig === 'function' ){
            var config = this.getDataSyncConfig();
            if( !config ){
                _private.warn('getDataSyncConfig return null data array');
                return;
            }
            dataArray = config;
        }
        else{
            //we need some pattern to know if a property should be sync
            var pattern;
            if( this.dataSyncPattern ){
                pattern = this.dataSyncPattern
            }
            else if( _private.config.dataSyncPattern ){
                pattern = _private.config.dataSyncPattern;
            }

            if( !pattern ){
                _private.warn('no pattern was found for the data sync. either remove the data sync mixin from the component or provide dataSyncPattern property in the component or in the config.');
                return;
            }

            if( !(pattern instanceof RegExp) ){
                try{
                    pattern = new RegExp(pattern);
                }
                catch(err){
                    _private.warn('pattern is not a valid regular expression string',err);
                    return;
                }
            }


            //looking for the pattern
            for( var propertyName in this ){
                if( pattern.test(propertyName) && typeof this[propertyName] !== 'function' && propertyName !== 'dataSyncPattern' ){
                    dataArray.push({
                        name: propertyName,
                        trigger: true,
                        listen: true,
                        callbackName: "onDataSync",
                        setDataWhenNoCallback: true
                    });
                }
            }
        }

        var obj = this;
        for( var i=0; i<dataArray.length; i++ ) {
            (function () {
                var _propertyName = dataArray[i].name;
                var callbackName = dataArray[i].callbackName;
                var setDataWhenNoCallback = dataArray[i].setDataWhenNoCallback;

                if (dataArray[i].listen) {
                    //we want to register for this change on different components.
                    _private.registerForPropertyChange(obj, _propertyName, function (name, newValue, oldValue) {
                        if (typeof this[callbackName] === 'function') {
                            this[callbackName](name, newValue, oldValue);
                        }
                        else if (setDataWhenNoCallback) {
                            this[name] = newValue;
                        }
                    }.bind(this));
                }

                if (dataArray[i].trigger) {
                    //we want to tell other components that it was changed.
                    this.$watch(_propertyName, function (newValue, oldValue) {
                        _private.reportPropertyChanged(obj, _propertyName, newValue, oldValue);
                    }.bind(this));
                }
            }.bind(this))();
        }
    }
};