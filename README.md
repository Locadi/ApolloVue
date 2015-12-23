# ApolloVue Documentation

## What is ApolloVue
ApolloVue is a mini utility framework on top of [Vue.JS](http://vuejs.org/) which was designed to enforce some stnadards and provide help in developing asynchronious components in Vue. 

## Motivation
After a short research and development using Vue, I found that while it is light and slim than Angular, it doesn't provide some important requirements I was looking for when developing components in Javascript.

Here are the requirements which led to the development of this mini framework:
* Tag Components
* Dynamic Templating
* Dynamic Instantiating
* Asynchronous Initialization
* Data Decoupeling
* DOM Event Communication

### Tag Components
While Vue support this out of the box, some of the other requirements were not supporting this reqwuirement. The basic idea here is that we want to be able to treat a component like a normal DOM tag.

### Dynamic Templating
A component should be able to load it's template if it is not loaded yet, and it should be possible to instantiate a componenet with different temapltes by setting different template name in the tag. 
For example:

```html
<av-calendar templates="template1"></av-calendar>
<av-calendar templates="template2"></av-calendar>
```

so we could have 2 instances of the same compoenent but with 2 different templates. 

### Dynamic Instantiating
Components should be treated as normal tags and as such, it should be possible to create a new component by adding it's tag into the DOM. 

For example, this should be supported:

```javascript
$('body').append('<div><av-calendar templates="template1"></av-calendar></div>');
```

### Asynchronous Initialization
Vue life cycle is synchrounusly, and components should be initialized in an async way to allow them to load resources from a remote server.

### Data Decoupeling
Components structure should allow to inject a data provider object. Once a component was set with a data provider, it should use it to load the component data in an async way. This might be useful to have different data set for  dev and live environment, or even different data sets for the same component in different senarios. 

### DOM Event Communication
Vue event system is independent from the native DOM events and works differently. Components should communicate using the DOM events to support non-Vue code to communicate and to enjoy the benefits of using the DOM events. 

## Dependencies 
ApolloVue is dependent on the followings:
* Vue (>=1.0)
* jQuery (>=1.7)
* [ES6 Promise](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise) you can use the [ES6 promise polyfill](https://github.com/lahmatiy/es6-promise-polyfill) to support older browsers. 

## Installation
include the library just after the vue script like so:

```html
<script src="/bower_components/vue/dist/vue.js"></script>
<script src="/bower_components/apollo-vue/dist/apollo-vue.js"></script>
```

ApolloVue can be configured using a config file. In case you have a seperate script file for the config add it before the apollo-vew script like so:

```html
<script src="/bower_components/vue/dist/vue.js"></script>
<script src="/scripts/config/apollo-vue-cfg.js"></script>
<script src="/bower_components/apollo-vue/dist/apollo-vue.js"></script>
```

just make sure the config file is setting a global variable named **ApolloVCOnfig**. You can learn more about the config option in the config section of this documentation. 

## API
ApolloVue is a set of a few method and mainly some mixins to put some structure and improve the creation and initialization of Vue components.
 
ApolloVue is accessible via the **ApolloV** namespace to the global scope.  

### ApolloV.mixins
ApolloVue is mainly about providing some small utility mixin to compoenent which are exposed by the *mixins* property. To learn more about each mixin refer to the Mixins part of the documnetation

### ApolloV.templates
**ApolloV.templates.load(templateId)**

ApolloVue allows you to load templates dynamicly for components. This is used in the *DynamicTemplateMixin* but can be used in anycase which a template or a partial is needed to be loaded from a remote resource. 

**templateId** - {String} a unique template id

**return** - {Promise} 

In order to load templates from the server ApolloVue is required to resolve the templateId to some resource URL and to use some HTTP request. 
You can help ApolloVue with these tasks by setting the following configurations in the config object:

**ApolloVConfig.http** {function} this method needs to return a Promise which will provide the resource in the resolve method. the method will get as parameter the URL.

**ApolloVConfig.templateId2URL** {function} this method will get the templateId and will return a URL to fetch this template. if this is not provided ApolloVue will just try to fetch *"/{templateId}/"* 

For example:

```javascript
var ApolloVConfig = {
	http: function(url){
		return new Promise( function(resolve){
			jQuery.ajax({
				method : "GET",
				url: url,
				success: function(data,textStatus,jqXHR){
					resolve(data);
				}.bind(this)
			});
		});
	},
	templateId2URL: function(templateId){
		return '/partials/_mod_'+templateId+'.ejs';
	}
};
```

### ApolloV.config
**ApolloV.config.setConfig(config)**

Use this method to set the entire config object at runtime. 

**config** {Object} the new config object.

### ApolloV.components
**ApolloV.components.create(tagName,obj)**

This method should be called to create Vue components. This is just a wrapping method ontop of *Vue.extend* and *Vue.component* with the addition
of allowing to inject global mixins to all components.

**tagName** {String} the component tags name. You can omit this parameter and pass the *obj* as the first paramter to create Vue component wihtout an associated 
tag name. 

**obj** {Object} the Vue object as *Vue.extend* expects. 

In order to control which mixins will be injected to all the components, you need to set in the config file the *globalMixins* method to return an array of all the global mixins which are required to be injected to all components. 

For example, if you would like to make sure that all components in your project gets the *ApolloV.mixins.template* and *ApolloV.mixins.events* you should do the following:

```javascript
var ApolloVConfig = {
	globalMixins: function(componentTagName){
		return [ApolloV.mixins.template,ApolloV.mixins.events]
	}
}
```

Of course *globalMixins* can return an array of not just mixins from ApolloVue but any mixin which you want to be injected to all created components. 



**ApolloV.components.render(root)**

Use this method to tell ApolloVue to scan the DOM tree starting from a given root, and find Vue components tag that requires to be initalized and rendered.

**root** {String|DOMElement} if this is not provided, then it will be set to the body. If this is a string it should be a CSS selectors. 

Use this method when you inject components to the DOM as tags and you need to tell Vue to render them. 

Lets see an example:

```javascript
$('body').append('<div><av-calendar templates="template1"></av-calendar></div>'):
//the new component was inserted to the DOM as a tag, 
//and now we need to tell Vue to initialize it
ApolloV.components.render();
``` 

### ApolloV.data
**ApolloV.data.registerProvider(name,provider)** 

ApolloVue introdice a pattern of data providers which allow the componenets to load thier data. The data providers are objects or functions with the only purpose to fetch the data for the component. This makes sense if you want to have one component and in different senarios to load different data.  This method register a new data provider with ApolloVue. It is required to register data providers since if components use the *dataProvider* mixin ApolloVue take care of loading the data, and support the attribute *data-provider* to associate the component with a data provider. 

For example, we will create two calendar componenets, where one will fetch data from Google calendar and one from Exchange. 

```html
<av-calendar templates="tpl1" data-provider="calendar-google"></av-calendar>
<av-calendar templates="tpl1" data-provider="calendar-exchange"></av-calendar>
```

and this is how we would create the component:

```javascript
ApolloV.components.create( 'av-calendar' , {
	mixins: [ApolloV.mixins.dataProvider]
	
	//normal Vue component object...
} );
```

This is just one way to register data providers, and there are a few more topns using the config file. 

To learn more about the data provider mixin you should go to the mixins section of the documentation. 

## Mixins

### ApolloV.mixins.asyncInit
Use this mixin for a component which needs to do some async processing before rendering. When the component is ready it should call the *resolveInit* method which is added by the mixin. The mixin is hiding the component in the *compiled* hook and will show it again when the method *resolveInit* is called. 
The component is hidden using *"visibility":"hidden"*, so it might take some space in the view. If it is required that the component will not take any space while it is hidding, the component needs to addd a data called *asyncType* and set it to *"absolute"*. 

**asyncInit** {bool} - the mixin is adding this data attribute to the component to mark is as a async component. 

**resolveInit()** - method which the mixin adds and the component should call it to show back the component after it has finished doying async tasks. 

Lets see the following example:

```javascript
ApolloV.components.create('av-calendar' , {
	mixins: [ApolloV.mixins.asyncInit],
	
	data: function(){
		days: []
	}
	
	ready: function(){
		var worker = new Worker("dom-some-long-calc.js");
		worker.addEventListener('message', function(e) {
			this.days = e.data;
			this.resolveInit();
		}.bind(this), false);		
	}
} );
```

In case you want to hide the component in an absolute position, so it will not take its space in the DOM, you just need to add the *asyncType* like so:

```javascript
ApolloV.components.create('av-calendar' , {
	mixins: [ApolloV.mixins.asyncInit],
	
	data: function(){
		asyncType : 'absolute',
		days: []		
	}	
} );
```

### ApolloV.mixins.template
Template mixin adds the *templates* property and replace the template option in case the component tag has the templates attribute. This allows to override the default template.

**templates** {property} template id to set to the component. this id needs to match an element id in the DOM, for example a script template. 

Lets see an example were we might want to instantiate 2 different calendar components with different templates

```html
<av-calendar templates="desktop-calendar"></av-calendar>
<av-calendar templates="mobile-calendar"></av-calendar>
```

And the component

```javascript
ApolloV.components.create('av-calendar' ,{
	mixins: [ApolloV.mixins.template],
	
	//we don't need to set the template for Vue, it wil be set automatically. 
	ready: function(){
		//do my stuff...
	}
});
```

and somewhere in the DOM the templates should be available

```html
<script type="text/template id="desktop-calendar">
	<!-- code for desktop calendar template -->
</script>
<script type="text/template id="mobile-calendar">
	<!-- code for mobile calendar template -->
</script>
```

### ApolloV.mixins.dynamicTemplate
The dynamic template mixin will try to see if the template is not in the DOM, and if not, will try to load the template from the server. 
Since Vue life cycle is synchronously it is not possible to do this without some small trick (hacking you might say) to the Vue framework.  

If the template is not found ApolloVue will try to load the template using the *ApolloV.templates.load* method. Using the config file you can control 
how to convert the template id to a template URL, and even to provide a method to make http requests. You can read more about it in the *ApolloV.templates.load* documentation section. 

**How it is implemeneted** - like i said, Vue doesn't support this out of the box, so the mixin is imeplementing the following logic:

1. try to find the template by it's id
1. if found return
1. set an empty template so Vue will render a hidden DIV.
1. load the template from the server
1. create a script template tag and set its html to be the template + set it's id to be the template id
1. construct the original component tag and replace it with the component temp element. 
1. destroy the componenet
1. call *ApolloV.components.render* to instantiate the componenet again

Lets see am example:

First we create our component:

```javascript
ApolloV.components.create('av-calendar',{
	mixins: [ApolloV.mixins.template,ApolloV.mixins.dynamicTemplate],
	
	ready: function(){
		//do my stuff
	}
});
```

and we might want to set some config to help the mixin to load the template:

```javascript
var ApolloVConfig = {
	http: function(url){
		return new Promise( function(resolve){
			jQuery.ajax({
				method : "GET",
				url: url,
				success: function(data,textStatus,jqXHR){
					resolve(data);
				}.bind(this)
			});
		});
	},
	templateId2URL: function(templateId){
		return '/partials/_mod_'+templateId+'.ejs';
	}
};
```

### polloV.mixins.dataProvider
Data provider mixin allows for a component to set its data loading object. When this mixin is added to a component, the component data could set a *defaultDataProvider* name, or the component tag can override it with the *data-provider* attribute. 

For example, we will create two calendar componenets, where one will fetch data from Google calendar and one from Exchange. 

```html
<av-calendar templates="tpl1" data-provider="calendar-google"></av-calendar>
<av-calendar templates="tpl1" data-provider="calendar-exchange"></av-calendar>
```

and this is how we would create the component:

```javascript
ApolloV.components.create( 'av-calendar' , {
	mixins: [ApolloV.mixins.dataProvider]
	
	//normal Vue component object...
} );
```

A data provider is either an object which implement a load method, or just a function which is the same as the load method in the object option. 

The only functionality a data provider has is to load the data to the component. In case the data provider is a function this is how it should look like:

```javascript
function dateProviderCalendar(config){
	return new Promise( function( resolve ){
		//fetch some data from server
		resolve(results);
	} );
}
```

The method gets a config object which should help the data provider method to load the data. If you want to set the config sent to the load method you need to implement a method called *getDateProviderConfig* which will return the config object. 

For example, if we want to provide the load method the current day we might do something like this:

```javascript
ApolloV.components.create('av-calendar', {
	mixins: [ApolloV.mixins.dataProvider],
	
	methods: {
		getDateProviderConfig: function(){
			return {today: new Date() };
		}
	}
});
```

In case the data provider is an Object it needs to either implement a method called *load* which should be the same as described above for as if the data provider is a function, or it can implements a *data* method which return the data (this is better if the data can be returned in sync way). If the *data* is not a function, ApolloV will consider it as the actual data and will use it as the data that was loaded. 

Lets see a few implementations of object data providers:

```javascript
//data provider with load method
var CalendarLoaderDataProvider = {
	load: function(config){
		return new Promise( function( resolve ){
			//fetch some data from server
			resolve(results);
		} );
	}
}

//data provider with data method
var CalendarResolveDataProvider = {
	data: function(config){
		if( config.live ) reutrn window.liveCalendarData;
		return window.devCalendarData;
	}
}

//data provider with actual data
var CalendarData = {
	data: {...}
}
```

Data provider objects needs to be associated with a name and to be known by the ApolloVue. When ApolloV try to match a data provider to a given name it will do the following to try and resolve it:

1. check to see if this data provider was registered already using the *ApolloV.data.registerProvider* 
1. checks if *dataProviderName2Obj* was defined in the config file. you can define a method to allow ApolloVue to convert data provider name into the data provider object/function.
1. checks if *dataProviderNamespace* was defined in the config file. Define some namespace where all your data providers might be in the global namespace. This needs to be a string like: "app.data.providers" which ApolloVue will try to find in this namespace a data provider with the same name, like so: *app.data.providers[dataProviderName]* 
1. checks if *defaultDataProvider* was defined in the config file. you can define some default data provider which will be used foa ll components. 

If no data provider was match to the data provider name ApolloVue will issue a warning. 

Data provider mixin will add the following to the component:

**loading** {bool} data property which will be true when the data is loading. You can use it to mark the component is loading. For example:

```html
<div v-show="loading">componenet is now loading, be patiant</div>
```

**dataLoaded** {bool} this is set to true by the mixin after the data was loaded. This is false when the component is created and will set to true only once. This is useful if you use the *autoLoad* 

**autoLoad** in case you want the component to load the data when it is initialized, all you need to do is to set the *autoLoad* to true and the mixin will load the data in the *beforeCompile* hook. If this is set to true then you must also implement the method *afterDataLoaded* which will get the loaded data and a second boolean parameter to tell if the data was loaded in an sync way.

**loadData(config)** 

This method is responsible to load the data for the component. 

*config* - config object that will be passed to the data provider. If this is not provided the mixin will try to see if the *getDateProviderConfig* method was defined to provide a config object. 

*return* - the method return a Promise that will resolve the data that was loaded. 


Lets see an example:

```javascript
ApolloV.components.create('av-calendar',{
	mixins: [ApolloV.mixins.dataProvider,ApolloV.mixins.asyncInit],
	 
	data: function(){
		autoLoad: true
	},
	 
	methods: {
		//we defined this method to be called when the component data is ready
		afterDataLoaded: function(data,isSync){
        if( data && data.length ){
          this.items = data;
          this.selectItem(this.selectedId,true);
        }
		//now we are ready so show the component
		this.resoveInit();
		
      },
	}
});
```

Another way is to load the data manually

```javascript
ApolloV.components.create('av-calendar',{
	mixins: [ApolloV.mixins.dataProvider,ApolloV.mixins.asyncInit],
	 
	data: function(){
		
	},
	 
	methods: {
		loadNextWeek: function(){
			this.loadData(this.currentDay+7).then( function(data){
				this.weekData = data;
			}.bind(this));
		}
	}
});
```

### ApolloV.mixins.dataSync
The data sync mixin allows you to sync data properties between components. 

This mixin should be used when you want to sync data properties between different components or between instances of the same component.

There are two ways to use the data sync mixin, the explicit and the implicit way. 

#### Explicit Data Syncing using Config
This is the straightforward way in which you can define what to listen to and who is listening. This is all done using a data sync config which you need
to return by implementing a method called *getDataSyncConfig*.
 
**getDataSyncConfig()**
 
Implement this method and return an array of objects with the following properties:
 
**name** {string} the name of the data property you want to sync with

**trigger** {bool} set this to true if you want ApolloVue to fire an event when this property (with the given name) is changed. This will be done automatically for you. 
 
**listen** (bool} set this to true if you want to be notify when other components are firing the change event for properties with the given name.
 
**callbackName** {function} method which will be called when the an event of data sync has triggered by a different component. The method will get in the first parameter the property name, 
in the second parameter the new value, and in the 3rd parameter the old value: *onDataSync(name,newValue,oldValue* 

**setDataWhenNoCallback** {bool} set this to true if you don't provide *callbackName* and you just want that the same property will be set with the new value. So if the name was *firstName* and the value was
"amir", ApolloVue will set the component to have the same proeprty name with this value: *this.firstName = "amir"*. 

### Implicit Data Sync using pattern (and a bit of magic)
If you want to sync data properties between components, you can also use the more simple approach by defining a sync pattern. This pattern will be tested on all properties of the component and
the ones who match it will be synced. 
 
When ApolloVue will see a data property that matches the given pattern it will fire and listen to events on data change. You can still define a method called **onDataSync(name,newValue,oldValue)** if you want to control what to do with the data, but if you don't the value will be set to a matching property with the same name.    

You can set the pattern in two ways:

1. create a *dataSyncPattern* property in the component
1. create a *dataSyncPattern* property in the config for all components. 

The value can be a regular expression object or a regular expression string. 

Lets see an example of both approaches. 

```javascript
ApolloV.components.create('comp1',{
  mixins: [ApolloV.mixins.dataSync],

  template: '<h1 @click="toggle">{{name}}</h1>',


  data: function(){
    return {
      name: "John"
    }
  },

  methods: {
    toggle: function(){
      this.name = this.name === 'John' ? 'Smith': 'John';
    },

    getDataSyncConfig: function(){
      return [
        {
          name: 'name',
          trigger: true, //we want to notify about data changes
          listen: true, //we want to listen to other components events about the same name
          setDataWhenNoCallback: true //we dont' provide any callback and we just want to data to be set to this instance this.name
        },
        {
          name: 'dsName',
          listen: true, //we want to listen to other components events about the same name
          trigger: false, //we don't have this property so we don't need the trigger
          callbackName: "onComp2NameChange", //we want to catch the event in this method
          setDataWhenNoCallback: false //no need to fallback method 
        }
      ];
    },

    onComp2NameChange: function(name,value){
      this.name = value; //mapping dsName to name. 
    }


  }
});


ApolloV.components.create('comp2',{
  mixins: [ApolloV.mixins.dataSync],

  template: '<h5 @click="toggle">{{dsName}}</h5>',


  data: function(){
    return {
      dataSyncPattern: /^ds/, //we define a ds prefix in the data sync pattern so all properties with ds prefix will be sync (dsName) 
      dsName: "John"  //since we define a prefix of ds and we didn't provide getDataSyncConfig , everything will happen automatically
    }
  },

  methods: {
    toggle: function(){
      this.dsName = this.dsName === 'John' ? 'Smith': 'John';
    }
  }
});
```

and the html:

```html
<comp1></comp1>
<comp2></comp2>
<comp1></comp1>
<comp2></comp2>
```

When the user will click on the components, it will update the name on the other components accordingly. 


 

### ApolloV.mixins.events
Vue event system is independent from the native DOM events and works differently. The events mixin uses the DOM events mechanism and just makes it easier to define, listen and fire events as long as the events are defined in a specific way which the mixin expects. 

When this mixin is used the component should define in the data an array called *events*. The mixin will read the events array and will register for DOM events and create fire methods according to the following:

In case the item in the array is a string the mixin will expect the following format:

**comp-name:event-state-change** - this is for component which wants to fire events about state changes. In this case the mixin will generate the method *fireStateChange*

**comp-name:command-method-name** - this is for components which needs to listen to commands which are triggered by event. In this case the mixin will register for the event *comp-name:command-method-name* and will call *methodName* when this event is triggered.

the convention of the events name is as follows: 

*event-* is for *state* events which the component should fire to notify listeners about changes in the component. 

*command-* is for *command* events which the component is listening to to get some commands from external module, for example a page controller to tell the calendar to display a certain week or month. 

Lets see a an example:

```javascript
ApolloV.components.create('av-calendar',{
	mixins: [ApolloV.mixins.events],
	
	data: function(){
		return {
			events: [
				'av-calendar:event-day-selected', //ApolloVue will generate the method fireDaySelected
				'av-calendar:command-collapse' //ApolloVue will register to this event and will call the method collapse. 
			]
		}
	},
	
	methods: {
		collapse: function(){
			isCollapsed = true;
		},
		
		setSelectedDay: function(day){
			this.day = day;
			this.fireDaySelected(day);
		}
	}
});
```

and now some page control is listening and calling the command

```javascript
var pageCOntrol = {
	init: function(){
		$('.calendar').on('av-calendar:event-day-selected', function(e,data){
			//do something with the day
			this.selectedDay = data.day;
		});
		
		//collapse the calendar
		$('.calendar').trigger('av-calendar:command-collapse');
	}
}
```

You can also use a more explicit event definintion by providing an object in the events array. Each item in the array needs to have the name property and at least the handlerFn, and/or the fireFn. Here is all the options:

* name {String} the event name. in this case the event name could be any name regardless to the event naming standard mentioned above. 
* selector {String} this is optional in case we want to register to events that match specific selector. 
* handlerFn {String} method name which will be called if this event name has been fired on the component. if this is provided, the mixin will register for this event.
* fireFn {String} the method which should be generated for this event, so the component can fire this event.

Here is an example:

```javascript
ApolloV.components.create('av-calendar',{
	mixins: [ApolloV.mixins.events],
	
	data: function(){
		return {
			events: [
				{name:'shown.bs.collapse',handlerFn:'onVisible'}, //listning to bootstrap collapse event
				{name:'component-loaded',fireFn:"componentLoaded"}
			]
		}
	},
	
	ready: function(){
		this.componentLoaded();
	},
	
	methods: {
		onVisible: function(){
			isVisible = true;
		}		
	}
});
```

The mixin also add a method called *fire* which is used to fire all events. 

**fire(name,data,element)**

*name* {string} - the event name to fire

*data* {any} - the data to fire with the event

*element* {string|DOMElement} - if this is provided the event will be fired on this element, if not then the event is fired on the component element. 


## Config 
ApolloeVue allow you to set some settings to control some aspets of the library. 

You can set config file in two way:

1. set a global config variable named **ApolloVCOnfig** which needs to be defined before the ApolloVue. 
1. set a config object using the *ApolloV.config.setConfig* method. 

It is recommended to set the config settings before the ApolloVue is initialized. 

Here are the config options:

### noLog {boolean}
if this is set to true ApolloVue will not write to the console.

### debug {boolean}
if this is set to true additional debugging messages will be written to the console.

### http(url){function}
Set here a method to fetch resources from the server. This method gets the URL and needs to return a Promise. If this is not provided the default is to use jQuery.ajax with a GET request. 

### templateId2URL(templateId) {function}
Set a method to convert a template id to a template URL. The method gets the template id and needs to return the URL for the template.

### dataProviders {Object}
Set a key-value map which keys are data providers names and the value is the data provider object/function. You can learn more about data providers in the data provider mixin section. 

### defaultDataProvider {function|Object}
Set this Object to be used for all unresolved data providers name. 

### dataProviderName2Obj(name) {function}
Set this method if you want to map data providers name to data provider object/function. 

### dataProviderNamespace {string}
Define some namespace where all your data providers might be in the global namespace. This needs to be a string like: "app.data.providers" which ApolloVue will try to find in this namespace a data provider with the same name, like so: *app.data.providers[dataProviderName]* 

### globalMixins(tagName) {funciton}
Set a method which should return an array of all the mixins that should be set to any component that is created using ApolloVue. The method gets the tag name of the component to allow you to decide which mixins to put for specific components. It is recommended to set all components with teh template and events mixins. 
