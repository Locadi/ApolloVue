/**
 * Template mixin adds the templates property and replace the template
 * option in case the component tag has the templates attribute. This allows
 * to override the default template.
 */
var TemplateMixin = {
    props: ['templates'],

    created: function(){
        if( this.templates && this.templates.length ){
            var name = _private.getComponentTagName(this);
            _private.debug('found templates attribute for ' + name ,'TemplateMixin');
            this.templates = this.templates.split(",");

            //override the template id
            this.$options.template = "#"+this.templates[0];
        }
    }
};