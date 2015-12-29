/**
 * data provider mixin allows for a component to set its data loading object. when this mixin is
 * added to a component, the component data could set a defaultDataProvider name, or the component tag
 * can override it with data-provider attribute.
 * the data provider object needs to be registered using ApolloV.data.registerProvider method.
 * The component needs to implement the afterDataLoaded method and can implement the getDateProviderConfig
 * method to provide to the data loader function some config.
 *
 * afterDataLoaded gets as first parameter the data that was loaded. it is the responsibility of this method to set the data
 * to the correct binded data to make sure it updates the View. the second parameter is a boolean which indicates if the
 * data was loaded in async or sync way (true=sync way)
 *
 */
var DataProviderMixin = {
    props: ['data-provider'],

    data: function() {
        return {
            dataLoaded: false,
            loading: false
        }
    },

    beforeCompile: function(){
        //if autoLoad is not set then we don't load the data automatically, it will need to be called explicitly.
        if( !this.autoLoad ){
            return;
        }

        if( typeof this.afterDataLoaded !== 'function' ){
            _private.warn("autoLoad is true but component didn't implement afterDataLoaded. set autoLoad=false to manual load data or implement afterDataLoaded");
            return;
        }

        this.loadData().then( function(data){
            this.afterDataLoaded(data);
        }.bind(this));
    },

    methods: {
        loadData: function(config){
            this.loading = true;
            return new Promise( function(resolve){
                var loader = _private.getDataProviderObject( this.dataProvider || this.defaultDataProvider );

                if( !loader ){
                    _private.warn("data provider was not set for this component: "+ _private.getComponentTagName(this));
                    return;
                }


                if( typeof this.getDateProviderConfig === 'function' && !config ){
                    config = this.getDateProviderConfig();
                }

                config = config || {};


                config['component-name'] = _private.getComponentTagName(this);

                if( loader.data ){
                    if( typeof loader.data === 'function' ){
                        this.loading = false;
                        resolve(loader.data(config),true); //true means that the data was loaded synchroniously
                        this.dataLoaded = true;
                    }
                    else{
                        this.loading = false;
                        resolve(loader.data,true); //true means that the data was loaded synchroniously
                        this.dataLoaded = true;
                    }
                    return;
                }

                if( typeof loader === 'function' ){
                    loader(config).then( function(data){
                        this.loading = false;
                        resolve(data);
                        this.dataLoaded = true;
                    }.bind(this));
                }
                else if( loader.load ){
                    loader.load(config).then( function(data){
                        this.loading = false;
                        resolve(data);
                        this.dataLoaded = true;
                    }.bind(this));
                }
                else{
                    _private.warn("unkown data provider object.");
                }
            }.bind(this));
        }
    }
};