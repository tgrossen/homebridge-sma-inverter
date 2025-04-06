const inherits = require("util").inherits,
	ModbusRTU = require("modbus-serial");
const uuid = require("uuid").v4;

var client = new ModbusRTU();

var Service, Characteristic, Accessory;

module.exports = function(homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	Accessory = homebridge.hap.Accessory;

	homebridge.registerAccessory("homebridge-sma-home-manager", "SMAHomeManager", SMAHomeManager);
};

function SMAHomeManager(log, config) {
	this.log = log;
	this.name = config["name"] || "SMA Solar Inverter";
	this.address = config["address"] || "169.254.12.3";
	const refreshInterval = (config['refreshInterval'] * 1000) || 1000;
	this.debug = config["debug"] || false;
	this.readyToRefresh = false;

	const customAmperesUUID = uuid();
	Characteristic.CustomAmperes = function() {
		// Characteristic.call(this, 'Amperes', customAmperesUUID);
		// this.setProps({
		// 	format: Characteristic.Formats.FLOAT,
		// 	unit: 'A',
		// 	minValue: 0,
		// 	maxValue: 65535,
		// 	minStep: 0.01,
		// 	perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		// });
		// this.value = this.getDefaultValue();
	};
	inherits(Characteristic.CustomAmperes, Characteristic);
	Characteristic.CustomAmperes.UUID = customAmperesUUID;

	const currentAmbientLightLevelUUID = uuid();
	Characteristic.CurrentAmbientLightLevel = function() {
		// Characteristic.call(this, 'Total Consumption', currentAmbientLightLevelUUID);
		// this.setProps({
		// 	format: Characteristic.Formats.FLOAT,
		// 	unit: 'kWh',
		// 	minValue: 0,
		// 	maxValue: 65535,
		// 	minStep: 0.001,
		// 	perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		// });
		// this.value = this.getDefaultValue();
	};
	inherits(Characteristic.CurrentAmbientLightLevel, Characteristic);
	Characteristic.CurrentAmbientLightLevel.UUID = currentAmbientLightLevelUUID;

	const customVoltsUUID = uuid();
	Characteristic.CustomVolts = function() {
		// Characteristic.call(this, 'Volts', customVoltsUUID);
		// this.setProps({
		// 	format: Characteristic.Formats.FLOAT,
		// 	unit: 'V',
		// 	minValue: 0,
		// 	maxValue: 65535,
		// 	minStep: 0.1,
		// 	perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		// });
		// this.value = this.getDefaultValue();
	};
	inherits(Characteristic.CustomVolts, Characteristic);
	Characteristic.CustomVolts.UUID = customVoltsUUID;

	const customWattsUUID = uuid();
	Characteristic.CustomWatts = function() {
		// Characteristic.call(this, 'Consumption', customWattsUUID);
		// this.setProps({
		// 	format: Characteristic.Formats.FLOAT,
		// 	unit: 'W',
		// 	minValue: 0,
		// 	maxValue: 65535,
		// 	minStep: 0.1,
		// 	perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		// });
		// this.value = this.getDefaultValue();
	};
	inherits(Characteristic.CustomWatts, Characteristic);
	Characteristic.CustomWatts.UUID = customWattsUUID;

	// Start the connection and refresh cycles
	this._connect();
	setInterval(function() {
		if (this.readyToRefresh) {
			this._refresh();
		}
	}.bind(this), refreshInterval);
}

SMAHomeManager.prototype = {

	identify: function(callback) {
		this.log("identify");
		callback();
	},

	_connect: function() {
		if(this.debug) {this.log("Attempting connection", this.address);}

		// Connect to the ModBus server IP address
		try {
			client.connectTCP(this.address);
		}
		catch(err) {
			this.log("Connection attempt failed");
			return;
		}

		try {
			// Set the ModBus Id to use
			client.setID(3);

			if(this.debug) {this.log("Connection successful");}
		}
		catch(err) {this.log("Could not set the Channel Number");}
	},

	_refresh: function() {
		// Obtain the values
		try {
			/*
			// Serial Number
			client.readHoldingRegisters(30057, 10, function(err, data) {this.value.SerialNumber = data.buffer.readUInt32BE();}.bind(this));
			*/

			// Inverter: StatusActive & StatusFault characteristics
			client.readHoldingRegisters(30201, 10, function(err, data) {
				const condition = data.buffer.readUInt32BE();
				// 35 = Fault
				if (condition === 35) {
					this.inverter.getCharacteristic(Characteristic.StatusActive).updateValue(false);
					this.inverter.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT);
				}
				// 455 = Warning
				else if (condition === 455) {
					this.inverter.getCharacteristic(Characteristic.StatusActive).updateValue(True);
					this.inverter.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.GENERAL_FAULT);
				}
				// 303 = Off, 307 = Ok
				else {
					this.inverter.getCharacteristic(Characteristic.StatusFault).updateValue(Characteristic.StatusFault.NO_FAULT);
					if (condition !== 303 && condition !== 307) {
						this.log('Unknown inverter condition', condition);
					}
					this.inverter.getCharacteristic(Characteristic.StatusActive).updateValue(condition === 307);
				}
			}.bind(this));

			client.readHoldingRegisters(30775, 10, function(err, data) {
				// Check if the value is unrealistic (the inverter is not generating)
				if(data.buffer.readUInt32BE() > 0 && data.buffer.readUInt32BE() <= (65535*1000) && typeof data.buffer.readUInt32BE() == 'number' && Number.isFinite(data.buffer.readUInt32BE())) {
					const solarWatts = data.buffer.readUInt32BE();
					if(this.debug) {this.log('Current production:', solarWatts, 'Watt');}
					this.inverter.getCharacteristic(Characteristic.On).updateValue(solarWatts > 0);

					// Eve - Watts
					this.inverter.getCharacteristic(Characteristic.CustomWatts).updateValue(solarWatts);
					this.inverter.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(solarWatts);

					// Only when solar panels are currently producing can we set A & V.
					if (solarWatts > 0) {
						// Eve - Amperes
						client.readHoldingRegisters(30977, 10, function(err, data) {
							if(data.buffer.readUInt32BE() > 0 && data.buffer.readUInt32BE() <= (65535*1000) && typeof data.buffer.readUInt32BE() == 'number' && Number.isFinite(data.buffer.readUInt32BE())) {
								this.inverter.getCharacteristic(Characteristic.CustomAmperes).updateValue(data.buffer.readUInt32BE() / 1000);
							}
						}.bind(this));

						// Eve - Volts
						client.readHoldingRegisters(30783, 10, function(err, data) {
							if(data.buffer.readUInt32BE() > 0 && data.buffer.readUInt32BE() <= (65535*100) && typeof data.buffer.readUInt32BE() == 'number' && Number.isFinite(data.buffer.readUInt32BE())) {
								this.inverter.getCharacteristic(Characteristic.CustomVolts).updateValue(data.buffer.readUInt32BE() / 100);
							}
						}.bind(this));
					}
				}
				else {
					this.log('Inverter not producing, setting values to 0');
					this.inverter.getCharacteristic(Characteristic.On).updateValue(false);
					this.inverter.getCharacteristic(Characteristic.CustomWatts).updateValue(0);
					this.inverter.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(0);
				}
			}.bind(this));

			// // Eve - kWh
			// client.readHoldingRegisters(30513, 10, function(err, data) {
			// 	this.log("Value", data.buffer.readUInt32BE());
			// 	if(data.buffer.readUInt32BE() > 0 && data.buffer.readUInt32BE() <= (65535*1000) && typeof data.buffer.readUInt32BE() == 'number' && Number.isFinite(data.buffer.readUInt32BE())) {4
			// 		this.log('setting current ambient light level', data.buffer.readUInt32BE() / 1000)
			// 		this.inverter.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(data.buffer.readUInt32BE() / 1000);
			// 	}
			// }.bind(this));
		}
		catch(err) {
			this.log("Refresh failed", "Attempting reconnect...", err);

			// Attempt to reconnect
			this._connect();
		}
	},

	getServices: function() {
		this.inverter = new Service.LightSensor(this.name);
		// Inverter being on/off is something the inverter decides itself, so do not give the user the illusion they can change it.
		this._makeReadonly(this.inverter.getCharacteristic(Characteristic.On));
		this.inverter.addCharacteristic(Characteristic.StatusActive);
		this.inverter.addCharacteristic(Characteristic.StatusFault);
		if (!this.inverter.getCharacteristic(Characteristic.CustomAmperes)) {
			this.inverter.addCharacteristic(Characteristic.CustomAmperes);
		}
		if (!this.inverter.getCharacteristic(Characteristic.CurrentAmbientLightLevel)) {
			this.inverter.addCharacteristic(Characteristic.CurrentAmbientLightLevel);
		}
		if (!this.inverter.getCharacteristic(Characteristic.CustomWatts)) {
			this.inverter.addCharacteristic(Characteristic.CustomWatts);
		}
		if (!this.inverter.getCharacteristic(Characteristic.CustomVolts)) {
			this.inverter.addCharacteristic(Characteristic.CustomVolts);
		}

		this.informationService = new Service.AccessoryInformation();
		this.informationService
			.setCharacteristic(Characteristic.Name, this.name)
			// @see https://github.com/homebridge/HAP-NodeJS/issues/940#issuecomment-1111470278
			.setCharacteristic(Characteristic.Manufacturer, 'SMA Solar Technology AG')
			.setCharacteristic(Characteristic.Model, 'Sunny Boy');
		
		this.readyToRefresh = true;

		return [
			this.inverter,
			this.informationService
		];
	},

	_makeReadonly(characteristic) {
		const readonlyPerms = [
			"pr" /* PAIRED_READ */,
			"ev" /* NOTIFY */,
		];
		characteristic.setProps({
			perms: characteristic.props.perms.filter(function (p) { return readonlyPerms.includes(p); })
		});
	}

};
