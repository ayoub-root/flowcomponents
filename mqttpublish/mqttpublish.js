exports.id = 'mqttpublish';
exports.title = 'MQTT publish';
exports.group = 'MQTT';
exports.color = '#656D78';
exports.version = '1.0.0';
exports.icon = 'clock-o';
exports.input = true;
exports.output = 0;
exports.author = 'Martin Smola';
exports.options = {};

exports.html = `<div class="padding">
	<div data-jc="dropdown" data-jc-path="broker" data-jc-config="datasource:mqttconfig.brokers;required:true" class="m">@(Brokers)</div>
	<div data-jc="textbox" data-jc-path="topic" data-jc-config="placeholder:hello/world" class="m">Topic</div>
	<div data-jc="dropdown" data-jc-path="qos" data-jc-config="items:,0,1,2" class="m">@(QoS)</div>
	<div data-jc="checkbox" data-jc-path="retain" class="m">@(Retain)</div>
</div>
<script>
	var mqttconfig = { brokers: [] };
	ON('open.mqttpublish', function(component, options) {
		TRIGGER('mqtt.brokers', 'mqttconfig.brokers');
	});
	ON('save.mqttpublish', function(component, options) {
		!component.name && (component.name = options.broker + ' -> ' + options.topic);
	});
</script>`;

exports.readme = `
# MQTT publish

If the topic field is left empty and the data object does not have a 'topic' property then nothing is send.`;


exports.install = function(instance) {

	var PUBLISH_OPTIONS = {};

	var added = false;
	var ready = false;

	instance.custom.reconfigure = function() {

		added = false;
		ready = false;

		if (!MQTT.broker(instance.options.broker))
			return instance.status('No broker', 'red');

		if (instance.options.broker && instance.options.topic) {

			!added && MQTT.add(instance.options.broker);
			added = true;
			ready = true;
			PUBLISH_OPTIONS.retain = instance.options.retain || false;
			PUBLISH_OPTIONS.qos = parseInt(instance.options.qos || 0);
			return;
		}

		instance.status('Not configured', 'red');
	};

	instance.on('options', instance.custom.reconfigure);

	instance.on('data', function(flowdata) {
		if (!ready)
			return;
		var msg = flowdata.data;
		var topic = instance.options.topic || msg.topic;
		if (topic)
			MQTT.publish(instance.options.broker, topic, msg, PUBLISH_OPTIONS);
		else
			instance.debug('MQTT publish no topic');
	});

	instance.on('close', function() {
		MQTT.remove(instance.options.broker, instance.id);
		OFF('mqtt.brokers.status', brokerstatus);
	});

	ON('mqtt.brokers.status', brokerstatus);

	function brokerstatus(status, brokerid, msg) {
		if (brokerid !== instance.options.broker)
			return;

		switch (status) {
			case 'connecting':
				instance.status('Connecting', '#a6c3ff');
				break;
			case 'connected':
				instance.status('Connected', 'green');
				break;
			case 'disconnected':
				instance.status('Disconnected', 'red');
				break;
			case 'connectionfailed':
				instance.status('Connection failed', 'red');
				break;
			case 'new':
			case 'removed':
				instance.custom.reconfigure();
				break;
			case 'error':
				instance.status(msg, 'red');
				break;
			case 'reconfigured':
				instance.options.broker = msg;
				instance.reconfig();
				instance.custom.reconfigure();
				break;
		}
	}

	instance.custom.reconfigure();
};
