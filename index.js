// @flow-runtime enable

// Trying to understand $Reify -> https://github.com/gcanti/babel-plugin-tcomb/issues/72

import { reify } from 'flow-runtime';
import type Type from 'flow-runtime';

let valueOverrides = {};

let typedDefaultOverrides = {};

export const typeDefaultsMap = {
    StringType: 'string_value',
    NumberType: 1,
    BooleanType: true,
    VoidType: null,
    NullableType: undefined,
    ExistentialType: {},
    FunctionType: () => {
    },
    DateType: new Date(),
    $PropertyType: '$PropertyType',
};

const primitiveTypes = [
    'StringType',
    'NumberType',
    'BooleanType',
    'VoidType',
    'FunctionType',
    'ExistentialType',
    'NullableType',
    'DateType',
    '$PropertyType',
];

const generatorMapping = {};

const buildMockObject = (type, overrideTypeName) => {
    const typeName = overrideTypeName || (reify: Type<type>).typeName;

    const generator = generatorMapping[typeName];

    if (!generator) {
        throw new Error(
            `Unknown type '${typeName}' - If you want to create a mock for this type please update the factory to handle it.`
        )
    }

    return generator(type);
};

const generateObjectProperty = (type): Object => {
    let value;

    if (Object.keys(valueOverrides).includes(type.key)) {
        const override = valueOverrides[type.key];
        value = typeof override === 'function' ? override() : override;
    } else {
        value = buildMockObject(type.value);
    }

    return {
        [type.key]: value,
    };
};


const generateObjectType = (type) => {
    const props = type.properties.map((objectType) => buildMockObject(objectType));
    const obj = {};
    props.map((mock) => Object.assign(obj, mock));
    return obj;
};

const generateValue = (type): * =>
    Object.keys(typedDefaultOverrides).includes(type.typeName)
        ? typedDefaultOverrides[type.typeName]
        : typeDefaultsMap[type.typeName]

// Populate generator mapping
primitiveTypes.forEach((primitiveType) => {
    generatorMapping[primitiveType] = generateValue;
});

// Type definitions according flow types
generatorMapping.TypeAlias = (type) => buildMockObject(type.type);
generatorMapping.ObjectType = (type) => generateObjectType(type);
generatorMapping.ObjectTypeProperty = (type) => generateObjectProperty(type);
generatorMapping.ArrayType = (type) => [buildMockObject(type.elementType)];

// Exotic types
generatorMapping.UnionType = (type) => type.types[0].value;
generatorMapping.TypeTDZ = (type) => buildMockObject(type.reveal());
generatorMapping.ParameterizedTypeAlias = () => ({});
generatorMapping.TypeParameterApplication = (type) => buildMockObject(type, type.parent.name);
generatorMapping.$ReadOnlyArray = (type) => [buildMockObject(type.typeInstances[0])];
generatorMapping.$KeysType = (type) => type.unwrap().types[0].value;
// You can add more exotic types here ...

export const generateMockObject = ({type, valueOverridesMap = {}, typeDefaultsOverridesMap = {}}) => {
    if (!type) {
        throw new Error('Must provide a type');
    }

    valueOverrides = valueOverridesMap;
    typedDefaultOverrides = typeDefaultsOverridesMap;

    return buildMockObject(type);
};