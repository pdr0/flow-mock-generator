import { generateMockObject, typeDefaultsMap } from './factory'

type MockStringType = {
  field: string,
}

type MockNumberType = {
  field: number,
}

type MockBooleanType = {
  field: boolean,
}

type MockVoidType = {
  field: void,
}

type MockFunctionType = {
  field: Function,
}

type MockExistentialType = {
  field: *,
}

type MockNullableType = {
  field: ?string,
}

type MockArrayType = {
  strings: Array<string>,
  numbers: Array<number>,
  booleans: Array<boolean>,
}

type MockUnknownType = 'fake'

type MockChoicesType = 'apples' | 'oranges' | 'bananas'

type MockNestedType = {
  nested: MockStringType,
}

const mockTypeMap = {
  StringType: MockStringType,
  NumberType: MockNumberType,
  BooleanType: MockBooleanType,
  VoidType: MockVoidType,
  FunctionType: MockFunctionType,
  ExistentialType: MockExistentialType,
  NullableType: MockNullableType,
}

describe('factory.js', () => {
  describe('error states', () => {
    it('should throw an error when no type specified', () => {
      expect.assertions(1)
      try {
        generateMockObject()
      } catch (error) {
        expect(error.message).toEqual('Must provide a type')
      }
    })

    it('should throw an error when an unknown type is specified', () => {
      expect.assertions(1)
      try {
        generateMockObject({ type: MockUnknownType })
      } catch (error) {
        expect(error.message).toEqual(
          "Unknown type 'StringLiteralType' - " +
            'If you want to create a mock for this type please update the factory to handle it.'
        )
      }
    })
  })

  describe('primitive types', () => {
    Object.keys(mockTypeMap).forEach((mockType) => {
      expect.assertions(2)

      it(`should return an object with correct default values for primitive type ${mockType}`, () => {
        const mock = generateMockObject({ type: mockTypeMap[mockType] })
        const { field } = mock
        expect(field).toEqual(typeDefaultsMap[mockType])
        if (typeof field === 'function') {
          expect(field()).toEqual(typeDefaultsMap[mockType]())
        }
      })
    })
  })

  describe('overridden defaults', () => {
    const typeDefaultsOverridesMap = {
      StringType: 'foo',
      NumberType: 0,
      BooleanType: false,
      FunctionType: () => 'foo',
    }

    Object.keys(typeDefaultsOverridesMap).forEach((mockType) => {
      it(`should return an object with correctly overriden default values for primitive type ${mockType}`, () => {
        expect.assertions(1)
        const mock = generateMockObject({ type: mockTypeMap[mockType], typeDefaultsOverridesMap })
        expect(mock.field).toEqual(typeDefaultsOverridesMap[mockType])
      })
    })
  })

  describe('overridden values', () => {
    const valueOverridesMap = {
      field: 'overriden_value',
    }

    it('should return a mock object with the value set to the override value', () => {
      expect.assertions(1)
      const mock = generateMockObject({ type: MockStringType, valueOverridesMap })
      expect(mock.field).toEqual(valueOverridesMap.field)
    })

    it('should execute an override value that is a function', () => {
      expect.assertions(1)
      const mockValueFn = (i) => `value_${i}`
      const mock = generateMockObject({ type: MockStringType, valueOverridesMap: { field: mockValueFn.bind(this, 0) } })
      expect(mock.field).toEqual('value_0')
    })
  })

  describe('more complex elements', () => {
    it('should handle String Array Types', () => {
      expect.assertions(1)
      const mock = generateMockObject({ type: MockArrayType })
      expect(mock.strings).toEqual([typeDefaultsMap.StringType])
    })

    it('should handle Number Array Types', () => {
      expect.assertions(1)
      const mock = generateMockObject({ type: MockArrayType })
      expect(mock.numbers).toEqual([typeDefaultsMap.NumberType])
    })

    it('should handle Boolean Array Types', () => {
      expect.assertions(1)
      const mock = generateMockObject({ type: MockArrayType })
      expect(mock.booleans).toEqual([typeDefaultsMap.BooleanType])
    })

    it('should handle Union Types', () => {
      expect.assertions(1)
      const mock = generateMockObject({ type: MockChoicesType })
      expect(mock).toEqual('apples')
    })

    it('should handle nested Object Types', () => {
      expect.assertions(1)

      const mock = generateMockObject({ type: MockNestedType })
      const expected = {
        nested: {
          field: typeDefaultsMap.StringType,
        },
      }
      expect(mock).toEqual(expected)
    })

    it('should handle nested nested Object Types', () => {
      expect.assertions(1)

      type T = {
        levelOne: MockNestedType,
      }

      const mock = generateMockObject({ type: T })
      const expected = {
        levelOne: {
          nested: {
            field: typeDefaultsMap.StringType,
          },
        },
      }

      expect(mock).toEqual(expected)
    })

    it('should generate a complex object correctly', () => {
      expect.assertions(1)

      type MockFruitOrderType = {
        fruit: MockChoicesType,
        quantity: number,
      }

      type MockAddressType = {
        houseNumber: number,
        street: string,
        postcode: string,
      }

      type MockFruitDeliveryType = {
        name: string,
        address: MockAddressType,
        isNextDayDelivery: boolean,
        orders: Array<MockFruitOrderType>,
      }

      const ordersFn = () => {
        const result = MockChoicesType.type.types.map((choice, i) =>
          generateMockObject({ type: MockFruitOrderType, valueOverridesMap: { quantity: i + 1, fruit: choice.value } })
        )

        return result
      }

      const valueOverridesMap = {
        houseNumber: 42,
        street: 'Fake St',
        postcode: 'SW 12345',
        name: 'John Johnson',
        orders: ordersFn,
      }

      const mock = generateMockObject({ type: MockFruitDeliveryType, valueOverridesMap })
      const expected = {
        name: valueOverridesMap.name,
        address: {
          houseNumber: valueOverridesMap.houseNumber,
          street: valueOverridesMap.street,
          postcode: valueOverridesMap.postcode,
        },
        isNextDayDelivery: typeDefaultsMap.BooleanType,
        orders: MockChoicesType.type.types.map((choice, i) => ({ fruit: choice.value, quantity: i + 1 })),
      }
      expect(mock).toEqual(expected)
    })
  })
})
