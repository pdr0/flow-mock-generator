// @flow
// @flow-runtime enable

import { reify } from 'flow-runtime'
import type Type from 'flow-runtime'

export type FactoryType = {
    type: *,
    valueOverridesMap?: Object,
    typeDefaultsOverridesMap?: Object,
}

let valueOverrides = {}

let typedDefaultOverrides = {}

export const typeDefaultsMap = {
    StringType: 'string_value',
    NumberType: 1,
    BooleanType: true,
    VoidType: null,
    NullableType: undefined,
    ExistentialType: {},
    FunctionType: () => {},
    DateType: new Date(),
    $PropertyType: '$PropertyType',
}

// 'Primitive' types. These match to types in flow-runtime
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
]

const generatorMapping = {}

const buildMockObject = (type: Type, overrideTypeName?: string): Object => {
    const typeName: string = overrideTypeName || (reify: Type<type>).typeName

    const generator = generatorMapping[typeName]

    if (!generator) {
        throw new Error(
            `Unknown type '${typeName}' - If you want to create a mock for this type please update the factory to handle it.`
        )
    }

    return generator(type)
}

/**
 * Creates a mock object based on the provided Type. If we have an override for the requested type then use that
 * instead. If the override is a function then execute it and use that as the value.
 */
const generateObjectProperty = (type: Type): Object => {
    let value

    if (Object.keys(valueOverrides).includes(type.key)) {
        const override = valueOverrides[type.key]
        value = typeof override === 'function' ? override() : override
    } else {
        value = buildMockObject(type.value)
    }

    return {
        [type.key]: value,
    }
}

const generateObjectType = (type: Type) => {
    const props = type.properties.map((objectType: Type) => buildMockObject(objectType))
    const obj = {}
    props.map((mock: Object) => Object.assign(obj, mock))
    return obj
}


const generateValue = (type: Type): * =>
    Object.keys(typedDefaultOverrides).includes(type.typeName)
        ? typedDefaultOverrides[type.typeName]
        : typeDefaultsMap[type.typeName]


primitiveTypes.forEach((primitiveType: string) => {
    generatorMapping[primitiveType] = generateValue
})

generatorMapping.TypeAlias = (type: Type) => buildMockObject(type.type)
generatorMapping.ObjectType = (type: Type) => generateObjectType(type)
generatorMapping.ObjectTypeProperty = (type: Type) => generateObjectProperty(type)
generatorMapping.ArrayType = (type: Type) => [buildMockObject(type.elementType)]
generatorMapping.UnionType = (type: Type) => type.types[0].value
generatorMapping.TypeTDZ = (type: Type) => buildMockObject(type.reveal())
generatorMapping.ParameterizedTypeAlias = () => ({}) // Not sure how to handle this

generatorMapping.TypeParameterApplication = (type: Type) => buildMockObject(type, type.parent.name)
generatorMapping.$ReadOnlyArray = (type: Type) => [buildMockObject(type.typeInstances[0])]
generatorMapping.$KeysType = (type: Type) => type.unwrap().types[0].value

// Add more exotics types here ...

/**
 * Create a mock object for the requested type. Values within the object will be set on defaults for the Type
 * of each Object property. These default values can be overriden by providing a defaultsMap as an argument.
 * You can also provide an optional overrides map that can be used to override a specific field when the object
 * is created, this can be a fixed value or a function that gets executed when the mock is created.
 */
export const generateMockObject = ({type, valueOverridesMap = {}, typeDefaultsOverridesMap = {},}: FactoryType = {}): Object => {
    if (!type) {
        throw new Error('Must provide a type')
    }

    // Set overrides and defaults
    valueOverrides = valueOverridesMap
    typedDefaultOverrides = typeDefaultsOverridesMap

    return buildMockObject(type)
}
